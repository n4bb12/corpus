import { createOpenAI } from "@ai-sdk/openai"
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
import {
  type AnswerParagraph,
  buildCitedMarkdown,
  joinParagraphText,
  normalizeNumberedCitedMarkdown,
  parseCitationMarkers,
} from "src/lib/citations"
import { requireEnv } from "src/lib/env"
import {
  formatCorpusEvidence,
  formatFlatEvidence,
} from "src/lib/evidencePrompt"
import { MODELS } from "src/lib/limits"
import { formatDigestEvidence } from "src/lib/sourceDigest"
import {
  mapAnswerCitations,
  toStreamCitationCatalog,
} from "src/server/chat/answerCitationCatalog"
import { z } from "zod"

const answerSchema = z.object({
  insufficient: z.boolean(),
  paragraphs: z.array(
    z.object({
      // text before citations: after a paragraph's pills land, the next
      // paragraph can start immediately instead of waiting on its cites first.
      text: z.string(),
      citations: z.array(
        z.object({
          chunkId: z.string(),
          quote: z.string(),
        }),
      ),
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

export async function handleChatPost(request: Request) {
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

        persistInFlight = fetchAuthMutation(api.chat.appendAssistantText, {
          messageId: prepared.assistantMessageId as never,
          generationId: prepared.generationId,
          content: fullText,
        })
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
        const active = await fetchAuthMutation(api.chat.setProgressLabel, {
          messageId: prepared.assistantMessageId as never,
          generationId: prepared.generationId,
          progressLabel: label,
        })
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
        streamController.enqueue(encodeSse("insufficient", { insufficient }))
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
          mode: "factual" | "corpus"
          evidenceKind?: "digest" | "coverage" | "chunks"
          digestSections?: Array<{
            sourceId: string
            title: string
            digestText: string
            citations: Array<{
              chunkId: string
              quote: string
              locator?: {
                startOffset: number
                endOffset: number
                ordinal: number
              }
            }>
          }>
        }

        throwIfCanceled()

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

        const evidenceSourceIds = [
          ...new Set(
            evidencePack.evidence.map(
              (item: (typeof evidencePack.evidence)[number]) => item.sourceId,
            ),
          ),
        ]
        const titleSourceIds = [
          ...new Set([...prepared.sourceIds, ...evidenceSourceIds]),
        ]
        const sources = await Promise.all(
          titleSourceIds.map(async (sourceId) => {
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
        const sourceTitleById = new Map(
          sources.map(({ sourceId, source }) => [
            sourceId,
            typeof source?.title === "string" ? source.title : "",
          ]),
        )

        const distinctSourceCount = new Set(
          evidencePack.evidence.map(
            (item: (typeof evidencePack.evidence)[number]) => item.sourceId,
          ),
        ).size
        const useDigestEvidence =
          evidencePack.evidenceKind === "digest" &&
          !!evidencePack.digestSections?.length
        const useCorpusLayout =
          useDigestEvidence ||
          evidencePack.mode === "corpus" ||
          (distinctSourceCount > 1 && evidencePack.mode !== "factual")

        const evidenceBlock = useDigestEvidence
          ? formatDigestEvidence(
              evidencePack.digestSections ?? [],
              prepared.sourceIds,
            )
          : useCorpusLayout
            ? formatCorpusEvidence(
                evidencePack.evidence,
                sourceTitleById,
                prepared.sourceIds,
              )
            : formatFlatEvidence(evidencePack.evidence)

        const historyText = prepared.history
          .map(
            (pair: (typeof prepared.history)[number]) =>
              `User: ${pair.user.content ?? ""}\nAssistant: ${pair.assistant.content ?? ""}`,
          )
          .join("\n\n")

        const sourceNames = prepared.sourceIds
          .map((sourceId) => {
            const title = sourceTitleById.get(sourceId)?.trim()
            return title || sourceId
          })
          .join("; ")

        const corpusAddendum = useDigestEvidence
          ? `
This question is a cross-cutting task over multiple sources.
Selected sources: ${sourceNames || "(none)"}.
Evidence is a per-source digest with supporting quotes. Synthesize from the digests; cite only the provided supporting quote chunk ids.
You must cover every source section that has a digest—do not skip a source, and do not focus on only one source.
For summaries and briefs, cover each source in turn (or clearly synthesize with citations from each).
Ignore prior answers that omitted sources; re-answer from the digests below.
`
          : useCorpusLayout
            ? `
This question is a cross-cutting task over multiple sources.
Selected sources: ${sourceNames || "(none)"}.
Evidence is grouped under each source title. You must write at least one grounded paragraph with citations for every source section that has chunks—do not skip a source, and do not focus on only one source.
For summaries and briefs, cover each source in turn (or clearly synthesize with citations from each).
For contradictions or contested claims, state agreements and disagreements and cite each side.
Ignore prior answers that omitted sources; re-answer from the evidence below.
`
            : ""

        const system = `You are Corpus, a strictly source-grounded assistant.
Only answer using the supplied evidence ${useDigestEvidence ? "digests and supporting quotes" : "chunks"}.
Return a structured object with:
- insufficient: true when the evidence cannot answer the question; false when it can.
- paragraphs: ordered answer paragraphs. Each has text (markdown, no [[cite:…]] markers) then citations (evidence used by that paragraph).
Each citation must include chunkId and quote. The quote must be a short verbatim span copied from that chunk—ideally one sentence or less—that actually supports the paragraph.
When one paragraph draws on multiple distinct facts, include a separate citation (with its own quote) for each fact—even when they come from the same chunk.
Within a single answer paragraph, cite each source passage at most once per evidence chunk (do not list the same chunk twice when the quotes come from the same passage).
When insufficient is true, use one clear paragraph and leave every citations array empty.
When insufficient is false, every substantive factual paragraph must list the citations it relies on.
Do not invent facts from general knowledge.
Never include chunk IDs that were not supplied.
Never invent or paraphrase quotes; copy them from the evidence.${corpusAddendum}`

        const userPrompt = `Evidence:\n${evidenceBlock || "(none)"}\n\nRecent exchanges:\n${historyText || "(none)"}\n\nQuestion:\n${prepared.prompt}`
        const answerOutput = Output.object({ schema: answerSchema })

        await emitStatus(CHAT_PROGRESS.writing)

        const allowed = new Set(
          evidencePack.evidence.map(
            (item: (typeof evidencePack.evidence)[number]) =>
              String(item.chunkId),
          ),
        )
        const chunkTextById = new Map(
          evidencePack.evidence.map(
            (item: (typeof evidencePack.evidence)[number]) => [
              String(item.chunkId),
              item.text,
            ],
          ),
        )
        const citeOptions = {
          markerStyle: "numbered" as const,
          chunkTextById,
        }
        const streamingCiteOptions = {
          ...citeOptions,
          holdTrailingParagraphCitations: true,
        }

        const result = streamText({
          model: openai(MODELS.chat),
          system,
          prompt: userPrompt,
          abortSignal: controller.signal,
          output: answerOutput,
        })

        let latestAnswer: AnswerObject | null = null
        let lastStreamedCitationSignature = ""

        for await (const partial of result.partialOutputStream) {
          throwIfCanceled()

          if (typeof partial.insufficient === "boolean") {
            emitInsufficient(partial.insufficient)
          }

          const paragraphs = normalizeParagraphs(partial.paragraphs)

          if (
            typeof partial.insufficient === "boolean" &&
            partial.insufficient
          ) {
            emitText(joinParagraphText(paragraphs))
          } else {
            const built = buildCitedMarkdown(
              paragraphs,
              allowed,
              streamingCiteOptions,
            )

            emitText(normalizeNumberedCitedMarkdown(built.content))

            const citationSignature = JSON.stringify(
              built.citations.map((citation) => [
                citation.chunkId,
                citation.quote ?? "",
              ]),
            )

            if (citationSignature !== lastStreamedCitationSignature) {
              lastStreamedCitationSignature = citationSignature

              const streamingCatalog = toStreamCitationCatalog(
                mapAnswerCitations({
                  citations: built.citations,
                  evidence: evidencePack.evidence,
                  sourcesById,
                  resolveQuotes: false,
                }),
                sourcesById,
              )

              streamController.enqueue(
                encodeSse("citations", { citations: streamingCatalog }),
              )
            }
          }

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
        let built = buildCitedMarkdown(paragraphs, allowed, citeOptions)

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
          built = buildCitedMarkdown(paragraphs, allowed, citeOptions)
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

        const content = normalizeNumberedCitedMarkdown(built.content)

        if (content !== fullText.trim()) {
          emitText(content)
        }

        const titled = mapAnswerCitations({
          citations: built.citations,
          evidence: evidencePack.evidence,
          sourcesById,
          resolveQuotes: true,
        })

        const refinedCatalog = toStreamCitationCatalog(titled, sourcesById)

        streamController.enqueue(
          encodeSse("citations", { citations: refinedCatalog }),
        )

        await finalize({
          content,
          status: "complete",
          insufficient: false,
          citations: titled.map((citation) => ({
            sourceId: citation.sourceId as never,
            chunkId: citation.chunkId as never,
            sourceTitleSnapshot: citation.sourceTitleSnapshot,
            excerpt: citation.excerpt,
            locator: citation.locator,
            order: citation.order,
          })),
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
}
