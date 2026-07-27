import { createOpenAI } from "@ai-sdk/openai"
import { createFileRoute } from "@tanstack/react-router"
import { generateText, smoothStream, streamText } from "ai"
import { api } from "src/convex/_generated/api"
import {
  fetchAuthAction,
  fetchAuthMutation,
  fetchAuthQuery,
  getToken,
} from "src/lib/authServer"
import { formatChatError } from "src/lib/chatErrors"
import { CHAT_PROGRESS } from "src/lib/chatProgress"
import {
  isInsufficiencyAnswer,
  parseCitationMarkers,
  remapCitationMarkers,
  stripCitationMarkers,
  validateCitations,
} from "src/lib/citations"
import { requireEnv } from "src/lib/env"
import { MODELS } from "src/lib/limits"

function encodeSse(event: string, data: unknown) {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  )
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

        request.signal.addEventListener("abort", () => {
          controller.abort()
        })

        const stream = new ReadableStream({
          async start(streamController) {
            let fullText = ""
            let lastPersist = 0
            let persistInFlight: Promise<unknown> | null = null
            let settled = false

            const persistLatest = () => {
              if (persistInFlight) {
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
                .catch(() => undefined)
                .finally(() => {
                  persistInFlight = null
                })
            }

            const emitStatus = async (label: string) => {
              streamController.enqueue(encodeSse("status", { label }))
              await fetchAuthMutation(api.chat.setProgressLabel, {
                messageId: prepared.assistantMessageId as never,
                generationId: prepared.generationId,
                progressLabel: label,
              })
            }

            const finalize = async (args: {
              content: string
              status: "complete" | "failed" | "canceled"
              errorMessage?: string
              citations?: Array<{
                sourceId: never
                chunkId: never
                sourceTitleSnapshot: string
                excerpt: string
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
If evidence is insufficient, say that the selected sources do not support the answer, and do not include any [[cite:…]] markers.
For every substantive factual paragraph that answers the question, cite chunk IDs using [[cite:CHUNK_ID]] markers.
Do not invent facts from general knowledge.
Never cite chunk IDs that were not supplied.`

              const userPrompt = `Evidence:\n${evidenceBlock || "(none)"}\n\nRecent exchanges:\n${historyText || "(none)"}\n\nQuestion:\n${prepared.prompt}`

              if (evidencePack.insufficient) {
                fullText =
                  "The selected sources do not support an answer to that question."
                await finalize({
                  content: fullText,
                  status: "complete",
                  citations: [],
                })
                streamController.enqueue(encodeSse("text", { delta: fullText }))
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
                  const source = await fetchAuthQuery(api.sources.get, {
                    sourceId: sourceId as never,
                  }).catch(() => null)

                  return { sourceId, source }
                }),
              )
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

              const result = streamText({
                model: openai(MODELS.chat),
                system,
                prompt: userPrompt,
                abortSignal: controller.signal,
                experimental_transform: smoothStream({
                  delayInMs: 20,
                  chunking: "word",
                }),
              })

              for await (const part of result.stream) {
                if (part.type === "error") {
                  throw part.error instanceof Error
                    ? part.error
                    : new Error(formatChatError(part.error))
                }

                if (part.type !== "text-delta") {
                  continue
                }

                const delta = part.text
                fullText += delta
                streamController.enqueue(encodeSse("text", { delta }))

                const now = Date.now()

                if (now - lastPersist > 400) {
                  lastPersist = now
                  persistLatest()
                }
              }

              if (!fullText.trim()) {
                throw new Error("No answer came back. Try again.")
              }

              let parsed = parseCitationMarkers(fullText)
              const allowed = new Set(
                evidencePack.evidence.map(
                  (item: (typeof evidencePack.evidence)[number]) =>
                    String(item.chunkId),
                ),
              )
              let validation = validateCitations(parsed.citations, allowed)

              if (validation.invalid.length) {
                const retry = await generateText({
                  model: openai(MODELS.chat),
                  system: `${system}\nOnly cite these chunk IDs: ${[...allowed].join(", ")}`,
                  prompt: userPrompt,
                })
                fullText = retry.text
                parsed = parseCitationMarkers(fullText)
                validation = validateCitations(parsed.citations, allowed)
              }

              if (isInsufficiencyAnswer(parsed.text || fullText)) {
                const content = stripCitationMarkers(parsed.text || fullText)
                await finalize({
                  content,
                  status: "complete",
                  citations: [],
                })
                streamController.enqueue(encodeSse("done", {}))
                streamController.close()
                return
              }

              if (validation.invalid.length) {
                await finalize({
                  content: parsed.text || fullText,
                  status: "failed",
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

              const citations = validation.valid.map((citation, order) => {
                const evidence = evidencePack.evidence.find(
                  (item: (typeof evidencePack.evidence)[number]) =>
                    String(item.chunkId) === citation.chunkId,
                )

                return {
                  sourceId: evidence?.sourceId as never,
                  chunkId: citation.chunkId as never,
                  sourceTitleSnapshot: "Source",
                  excerpt: evidence?.text.slice(0, 400) || "",
                  locator:
                    evidence &&
                    typeof evidence.startOffset === "number" &&
                    typeof evidence.endOffset === "number" &&
                    typeof evidence.ordinal === "number"
                      ? {
                          startOffset: evidence.startOffset,
                          endOffset: evidence.endOffset,
                          ordinal: evidence.ordinal,
                        }
                      : undefined,
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

              const content = remapCitationMarkers(
                parsed.text,
                parsed.citations,
                validation.valid,
              )

              await finalize({
                content,
                status: "complete",
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
