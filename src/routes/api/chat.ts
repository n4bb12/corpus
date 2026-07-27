import { createOpenAI } from "@ai-sdk/openai"
import { createFileRoute } from "@tanstack/react-router"
import { generateText, Output, streamText } from "ai"
import { api } from "src/convex/_generated/api"
import {
  fetchAuthAction,
  fetchAuthMutation,
  fetchAuthQuery,
  getToken,
} from "src/lib/authServer"
import { formatChatError } from "src/lib/chatErrors"
import { CHAT_PROGRESS } from "src/lib/chatProgress"
import { resolveCitationQuote } from "src/lib/citationQuote"
import {
  type AnswerParagraph,
  buildCitedMarkdown,
  joinParagraphText,
  parseCitationMarkers,
} from "src/lib/citations"
import { requireEnv } from "src/lib/env"
import { MODELS } from "src/lib/limits"
import { z } from "zod"

const answerSchema = z.object({
  insufficient: z.boolean(),
  paragraphs: z.array(
    z.object({
      // citations first so chunk IDs bind before paragraph text streams in.
      citations: z.array(
        z.object({
          chunkId: z.string(),
          quote: z.string(),
        }),
      ),
      text: z.string(),
    }),
  ),
})

type AnswerObject = z.infer<typeof answerSchema>

function encodeSse(event: string, data: unknown) {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  )
}

function normalizeParagraphs(paragraphs: unknown): AnswerParagraph[] {
  if (!Array.isArray(paragraphs)) {
    return []
  }

  return paragraphs.flatMap((paragraph) => {
    if (!paragraph || typeof paragraph !== "object") {
      return []
    }

    const text =
      "text" in paragraph && typeof paragraph.text === "string"
        ? paragraph.text
        : ""
    const citations =
      "citations" in paragraph && Array.isArray(paragraph.citations)
        ? paragraph.citations.flatMap((citation: unknown) => {
            if (!citation || typeof citation !== "object") {
              return []
            }

            const chunkId =
              "chunkId" in citation && typeof citation.chunkId === "string"
                ? citation.chunkId
                : ""
            const quote =
              "quote" in citation && typeof citation.quote === "string"
                ? citation.quote
                : ""

            if (!chunkId) {
              return []
            }

            return [{ chunkId, quote }]
          })
        : []

    return [{ text, citations }]
  })
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = await getToken()

        if (!token) {
          return Response.json(
            { error: "You need to sign in to continue." },
            { status: 401 },
          )
        }

        const body = (await request.json()) as {
          notebookId: string
          prompt: string
          retryAssistantId?: string
        }

        let prepared: {
          generationId: string
          exchangeId: string
          userMessageId: string
          assistantMessageId: string
          sourceRevision: number
          sourceIds: string[]
          prompt: string
          history: Array<{
            user: { content?: string }
            assistant: { content?: string }
          }>
        }

        try {
          prepared = (await fetchAuthMutation(api.chat.prepareGeneration, {
            notebookId: body.notebookId as never,
            prompt: body.prompt,
            retryAssistantId: body.retryAssistantId as never,
          })) as typeof prepared
        } catch (error) {
          return Response.json(
            {
              error: formatChatError(error),
            },
            { status: 400 },
          )
        }

        const openai = createOpenAI({
          apiKey: requireEnv("OPENAI_API_KEY"),
        })

        const controller = new AbortController()

        const abortGeneration = () => {
          if (!controller.signal.aborted) {
            controller.abort()
          }
        }

        request.signal.addEventListener("abort", abortGeneration)

        const stream = new ReadableStream({
          cancel() {
            abortGeneration()
          },
          async start(streamController) {
            let fullText = ""
            let lastPersist = 0
            let persistInFlight: Promise<unknown> | null = null
            let settled = false
            let emittedInsufficient: boolean | null = null

            const throwIfCanceled = () => {
              if (controller.signal.aborted) {
                const error = new Error("Canceled")
                error.name = "AbortError"
                throw error
              }
            }

            const haltIfInactive = (active: unknown) => {
              if (active === false) {
                abortGeneration()
                throwIfCanceled()
              }
            }

            const persistLatest = () => {
              if (persistInFlight || controller.signal.aborted) {
                return
              }

              persistInFlight = fetchAuthMutation(
                api.chat.appendAssistantText,
                {
                  messageId: prepared.assistantMessageId as never,
                  generationId: prepared.generationId,
                  content: fullText,
                },
              )
                .then((active) => {
                  if (active === false) {
                    abortGeneration()
                  }
                })
                .catch(() => undefined)
                .finally(() => {
                  persistInFlight = null
                })
            }

            const emitStatus = async (label: string) => {
              throwIfCanceled()
              streamController.enqueue(encodeSse("status", { label }))
              const active = await fetchAuthMutation(
                api.chat.setProgressLabel,
                {
                  messageId: prepared.assistantMessageId as never,
                  generationId: prepared.generationId,
                  progressLabel: label,
                },
              )
              haltIfInactive(active)
            }

            const emitInsufficient = (insufficient: boolean) => {
              if (controller.signal.aborted) {
                return
              }

              if (emittedInsufficient === insufficient) {
                return
              }

              emittedInsufficient = insufficient
              streamController.enqueue(
                encodeSse("insufficient", { insufficient }),
              )
            }

            const emitText = (nextText: string) => {
              if (controller.signal.aborted) {
                return
              }

              if (nextText === fullText) {
                return
              }

              fullText = nextText
              streamController.enqueue(encodeSse("text", { text: nextText }))
            }

            const finalize = async (args: {
              content: string
              status: "complete" | "failed" | "canceled"
              errorMessage?: string
              insufficient?: boolean
              citations?: Array<{
                sourceId: never
                chunkId: never
                sourceTitleSnapshot: string
                excerpt: string
                locator?: {
                  startOffset: number
                  endOffset: number
                  ordinal: number
                }
                order: number
              }>
            }) => {
              if (settled) {
                return
              }

              settled = true

              try {
                await persistInFlight
                await fetchAuthMutation(api.chat.finalizeAssistant, {
                  messageId: prepared.assistantMessageId as never,
                  generationId: prepared.generationId,
                  content: args.content,
                  status: args.status,
                  errorMessage: args.errorMessage,
                  insufficient: args.insufficient,
                  citations: args.citations,
                })
              } catch {
                settled = false
                throw new Error("Couldn't save the answer.")
              }
            }

            try {
              await emitStatus(CHAT_PROGRESS.looking)

              const evidencePack = (await fetchAuthAction(
                api.retrieval.prepareEvidence,
                {
                  notebookId: body.notebookId as never,
                  prompt: prepared.prompt,
                  sourceIds: prepared.sourceIds as never,
                  messageId: prepared.assistantMessageId as never,
                  generationId: prepared.generationId,
                },
              )) as {
                evidence: Array<{
                  chunkId: string
                  sourceId: string
                  text: string
                  score: number
                  startOffset: number
                  endOffset: number
                  ordinal: number
                }>
                insufficient: boolean
              }

              throwIfCanceled()

              const evidenceBlock = evidencePack.evidence
                .map(
                  (
                    item: (typeof evidencePack.evidence)[number],
                    index: number,
                  ) =>
                    `[${index + 1}] chunk:${item.chunkId} source:${item.sourceId}\n${item.text}`,
                )
                .join("\n\n")

              const historyText = prepared.history
                .map(
                  (pair: (typeof prepared.history)[number]) =>
                    `User: ${pair.user.content ?? ""}\nAssistant: ${pair.assistant.content ?? ""}`,
                )
                .join("\n\n")

              const system = `You are Corpus, a strictly source-grounded assistant.
Only answer using the supplied evidence chunks.
Return a structured object with:
- insufficient: true when the evidence cannot answer the question; false when it can.
- paragraphs: ordered answer paragraphs. Each has citations (evidence used by that paragraph) and text (markdown, no [[cite:…]] markers).
Each citation must include chunkId and quote. The quote must be a short verbatim span copied from that chunk—ideally one sentence or less—that actually supports the paragraph.
When insufficient is true, use one clear paragraph and leave every citations array empty.
When insufficient is false, every substantive factual paragraph must list the citations it relies on.
Do not invent facts from general knowledge.
Never include chunk IDs that were not supplied.
Never invent or paraphrase quotes; copy them from the evidence.`

              const userPrompt = `Evidence:\n${evidenceBlock || "(none)"}\n\nRecent exchanges:\n${historyText || "(none)"}\n\nQuestion:\n${prepared.prompt}`
              const answerOutput = Output.object({ schema: answerSchema })

              if (evidencePack.insufficient) {
                fullText =
                  "The selected sources do not support an answer to that question."
                emitInsufficient(true)
                await finalize({
                  content: fullText,
                  status: "complete",
                  insufficient: true,
                  citations: [],
                })
                streamController.enqueue(encodeSse("text", { text: fullText }))
                streamController.enqueue(encodeSse("done", {}))
                streamController.close()
                return
              }

              const sourceIds = [
                ...new Set(
                  evidencePack.evidence.map(
                    (item: (typeof evidencePack.evidence)[number]) =>
                      item.sourceId,
                  ),
                ),
              ]
              const sources = await Promise.all(
                sourceIds.map(async (sourceId) => {
                  throwIfCanceled()
                  const source = await fetchAuthQuery(api.sources.get, {
                    sourceId: sourceId as never,
                  }).catch(() => null)

                  return { sourceId, source }
                }),
              )
              throwIfCanceled()
              const sourcesById = new Map(
                sources.map(({ sourceId, source }) => [sourceId, source]),
              )
              const citationCatalog = evidencePack.evidence.map(
                (item: (typeof evidencePack.evidence)[number]) => {
                  const source = sourcesById.get(item.sourceId)

                  return {
                    _id: String(item.chunkId),
                    chunkId: String(item.chunkId),
                    sourceId: item.sourceId,
                    liveTitle:
                      source?.title || item.text.slice(0, 48) || "Source",
                    excerpt: item.text.slice(0, 400),
                    canNavigate: !!source && !source.deletedAt,
                    locator: {
                      startOffset: item.startOffset,
                      endOffset: item.endOffset,
                      ordinal: item.ordinal,
                    },
                  }
                },
              )

              streamController.enqueue(
                encodeSse("citations", { citations: citationCatalog }),
              )
              await emitStatus(CHAT_PROGRESS.writing)

              const allowed = new Set(
                evidencePack.evidence.map(
                  (item: (typeof evidencePack.evidence)[number]) =>
                    String(item.chunkId),
                ),
              )

              const result = streamText({
                model: openai(MODELS.chat),
                system,
                prompt: userPrompt,
                abortSignal: controller.signal,
                output: answerOutput,
              })

              let latestAnswer: AnswerObject | null = null

              for await (const partial of result.partialOutputStream) {
                throwIfCanceled()

                if (typeof partial.insufficient === "boolean") {
                  emitInsufficient(partial.insufficient)
                }

                const paragraphs = normalizeParagraphs(partial.paragraphs)
                const nextText =
                  typeof partial.insufficient === "boolean" &&
                  partial.insufficient
                    ? joinParagraphText(paragraphs)
                    : buildCitedMarkdown(paragraphs, allowed).content

                emitText(nextText)

                const now = Date.now()

                if (now - lastPersist > 400) {
                  lastPersist = now
                  persistLatest()
                }
              }

              throwIfCanceled()
              const output = await result.output
              throwIfCanceled()

              if (!output) {
                throw new Error("No answer came back. Try again.")
              }

              latestAnswer = output

              let paragraphs = normalizeParagraphs(latestAnswer.paragraphs)
              let insufficient = latestAnswer.insufficient
              let built = buildCitedMarkdown(paragraphs, allowed)

              if (!insufficient && built.invalid.length) {
                const retry = await generateText({
                  model: openai(MODELS.chat),
                  system: `${system}\nOnly cite these chunk IDs: ${[...allowed].join(", ")}`,
                  prompt: userPrompt,
                  abortSignal: controller.signal,
                  output: answerOutput,
                })
                throwIfCanceled()

                if (!retry.output) {
                  throw new Error("No answer came back. Try again.")
                }

                latestAnswer = retry.output
                paragraphs = normalizeParagraphs(latestAnswer.paragraphs)
                insufficient = latestAnswer.insufficient
                built = buildCitedMarkdown(paragraphs, allowed)
              }

              throwIfCanceled()
              emitInsufficient(insufficient)

              if (insufficient) {
                const content = joinParagraphText(paragraphs)

                if (!content.trim()) {
                  throw new Error("No answer came back. Try again.")
                }

                emitText(content)
                await finalize({
                  content,
                  status: "complete",
                  insufficient: true,
                  citations: [],
                })
                streamController.enqueue(encodeSse("done", {}))
                streamController.close()
                return
              }

              if (built.invalid.length || !built.content.trim()) {
                await finalize({
                  content:
                    parseCitationMarkers(built.content).text ||
                    joinParagraphText(paragraphs),
                  status: "failed",
                  insufficient: false,
                  errorMessage:
                    "The answer couldn't be verified against your sources. Try again.",
                })
                streamController.enqueue(
                  encodeSse("error", {
                    message:
                      "The answer couldn't be verified against your sources. Try again.",
                  }),
                )
                streamController.close()
                return
              }

              const numbered = parseCitationMarkers(built.content)
              emitText(built.content)

              const citations = built.citations.map((citation, order) => {
                const evidence = evidencePack.evidence.find(
                  (item: (typeof evidencePack.evidence)[number]) =>
                    String(item.chunkId) === citation.chunkId,
                )

                const wholeChunkLocator =
                  evidence &&
                  typeof evidence.startOffset === "number" &&
                  typeof evidence.endOffset === "number" &&
                  typeof evidence.ordinal === "number"
                    ? {
                        startOffset: evidence.startOffset,
                        endOffset: evidence.endOffset,
                        ordinal: evidence.ordinal,
                      }
                    : undefined

                const resolved =
                  evidence && typeof citation.quote === "string"
                    ? resolveCitationQuote({
                        chunkText: evidence.text,
                        startOffset: evidence.startOffset,
                        endOffset: evidence.endOffset,
                        ordinal: evidence.ordinal,
                        quote: citation.quote,
                      })
                    : null

                return {
                  sourceId: evidence?.sourceId as never,
                  chunkId: citation.chunkId as never,
                  sourceTitleSnapshot: "Source",
                  excerpt:
                    resolved?.excerpt || evidence?.text.slice(0, 400) || "",
                  locator: resolved?.locator ?? wholeChunkLocator,
                  order,
                }
              })

              const titled = citations.map((citation) => ({
                ...citation,
                sourceTitleSnapshot:
                  sourcesById.get(String(citation.sourceId))?.title ||
                  citation.excerpt.slice(0, 48) ||
                  "Source",
              }))

              const refinedCatalog = titled.map((citation) => {
                const source = sourcesById.get(String(citation.sourceId))

                return {
                  _id: String(citation.chunkId),
                  chunkId: String(citation.chunkId),
                  sourceId: citation.sourceId,
                  liveTitle:
                    source?.title || citation.excerpt.slice(0, 48) || "Source",
                  excerpt: citation.excerpt,
                  canNavigate: !!source && !source.deletedAt,
                  locator: citation.locator,
                }
              })

              streamController.enqueue(
                encodeSse("citations", { citations: refinedCatalog }),
              )

              await finalize({
                content: numbered.text,
                status: "complete",
                insufficient: false,
                citations: titled,
              })

              streamController.enqueue(encodeSse("done", {}))
              streamController.close()
            } catch (error) {
              const canceled = controller.signal.aborted
              const message = formatChatError(error)

              try {
                await finalize({
                  content: fullText,
                  status: canceled ? "canceled" : "failed",
                  errorMessage: canceled ? undefined : message,
                })
              } catch {
                // Client will mark the turn failed if persistence fails.
              }

              try {
                if (!canceled) {
                  streamController.enqueue(
                    encodeSse("error", {
                      message,
                    }),
                  )
                }

                streamController.close()
              } catch {
                try {
                  streamController.error(
                    error instanceof Error ? error : new Error(message),
                  )
                } catch {
                  // Stream may already be closed.
                }
              }
            }
          },
        })

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        })
      },
    },
  },
})
