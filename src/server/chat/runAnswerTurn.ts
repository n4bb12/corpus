import {
  type AnswerCitationSlot,
  toAnswerCitationSlots,
} from "src/lib/answerCitation"
import { resolveCitationQuote } from "src/lib/citationQuote"
import {
  type AnswerParagraph,
  buildCitedMarkdown,
  type CitationRef,
  joinParagraphText,
  normalizeNumberedCitedMarkdown,
  parseCitationMarkers,
} from "src/lib/citations"
import type { EvidenceItem, PromptReadyEvidence } from "src/lib/evidencePack"
import type { DigestSection } from "src/lib/sourceDigest"
import { z } from "zod"

export type { DigestSection, EvidenceItem }

export const answerSchema = z.object({
  insufficient: z.boolean(),
  paragraphs: z.array(
    z.object({
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

export type AnswerObject = z.infer<typeof answerSchema>

export type EvidencePack = PromptReadyEvidence

export type SourceRecord = {
  title: string
  deletedAt?: number | null
}

export type PersistedAnswerCitation = {
  sourceId: string | undefined
  chunkId: string
  sourceTitleSnapshot: string
  excerpt: string
  locator?: {
    startOffset: number
    endOffset: number
    ordinal: number
  }
  order: number
}

export type AnswerPartial = {
  insufficient?: boolean
  paragraphs?: unknown
}

export type AnswerGenerator = {
  stream: (args: {
    system: string
    prompt: string
    abortSignal?: AbortSignal
  }) => {
    partials: AsyncIterable<AnswerPartial>
    output: PromiseLike<AnswerObject | null>
  }
  generateOnce: (args: {
    system: string
    prompt: string
    abortSignal?: AbortSignal
  }) => Promise<AnswerObject | null>
}

export type AnswerTurnResult = {
  content: string
  insufficient: boolean
  citations: PersistedAnswerCitation[]
  status: "complete" | "failed"
  errorMessage?: string
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

function mapAnswerCitations(args: {
  citations: CitationRef[]
  evidence: EvidenceItem[]
  sourcesById: Map<string, SourceRecord | null | undefined>
  resolveQuotes: boolean
}) {
  return args.citations.map((citation, order) => {
    const evidence = args.evidence.find(
      (item) => String(item.chunkId) === citation.chunkId,
    )

    const quote =
      typeof citation.quote === "string" ? citation.quote.trim() : ""

    const resolved =
      args.resolveQuotes && evidence && quote
        ? resolveCitationQuote({
            chunkText: evidence.text,
            startOffset: evidence.startOffset,
            endOffset: evidence.endOffset,
            ordinal: evidence.ordinal,
            quote,
          })
        : null

    const source = evidence
      ? args.sourcesById.get(String(evidence.sourceId))
      : null

    const excerpt =
      resolved?.excerpt || quote || evidence?.text.slice(0, 400) || ""

    return {
      sourceId: evidence ? String(evidence.sourceId) : undefined,
      chunkId: citation.chunkId,
      sourceTitleSnapshot: source?.title || excerpt.slice(0, 48) || "Source",
      excerpt,
      locator: resolved?.locator,
      order,
    } satisfies PersistedAnswerCitation
  })
}

function findMissingCitationSourceIds(
  citations: CitationRef[],
  evidence: EvidenceItem[],
) {
  const sourceIdByChunkId = new Map(
    evidence.map((item) => [String(item.chunkId), String(item.sourceId)]),
  )
  const requiredSourceIds = new Set(
    evidence.map((item) => String(item.sourceId)),
  )
  const citedSourceIds = new Set(
    citations.flatMap((citation) => {
      const sourceId = sourceIdByChunkId.get(citation.chunkId)

      return sourceId ? [sourceId] : []
    }),
  )

  return [...requiredSourceIds].filter(
    (sourceId) => !citedSourceIds.has(sourceId),
  )
}

function buildPrompts(args: {
  evidencePack: EvidencePack
  history: Array<{
    user: { content?: string }
    assistant: { content?: string }
  }>
  prompt: string
}) {
  const historyText = args.history
    .map(
      (pair) =>
        `User: ${pair.user.content ?? ""}\nAssistant: ${pair.assistant.content ?? ""}`,
    )
    .join("\n\n")

  const system = `You are Corpus, a strictly source-grounded assistant.
Only answer using the supplied evidence ${args.evidencePack.useDigestEvidence ? "digests and supporting quotes" : "chunks"}.
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
Never invent or paraphrase quotes; copy them from the evidence.${args.evidencePack.systemAddendum}`

  const userPrompt = `Evidence:\n${args.evidencePack.evidenceBlock || "(none)"}\n\nRecent exchanges:\n${historyText || "(none)"}\n\nQuestion:\n${args.prompt}`

  return { system, userPrompt }
}

/**
 * Deep Answer turn: evidence + history + generation port → content + Citation catalog.
 */
export async function runAnswerTurn(args: {
  evidencePack: EvidencePack
  sourcesById: Map<string, SourceRecord | null | undefined>
  history: Array<{
    user: { content?: string }
    assistant: { content?: string }
  }>
  prompt: string
  generateAnswer: AnswerGenerator
  abortSignal?: AbortSignal
  throwIfCanceled?: () => void
  onPartial?: {
    insufficient?: (insufficient: boolean) => void
    text?: (text: string) => void
    citations?: (citations: AnswerCitationSlot[]) => void
  }
}): Promise<AnswerTurnResult> {
  const throwIfCanceled = args.throwIfCanceled ?? (() => undefined)
  const onPartial = args.onPartial ?? {}

  const { system, userPrompt } = buildPrompts({
    evidencePack: args.evidencePack,
    history: args.history,
    prompt: args.prompt,
  })

  const allowed = new Set(
    args.evidencePack.evidence.map((item) => String(item.chunkId)),
  )
  const chunkTextById = new Map(
    args.evidencePack.evidence.map((item) => [String(item.chunkId), item.text]),
  )
  const citeOptions = {
    markerStyle: "numbered" as const,
    chunkTextById,
  }
  const streamingCiteOptions = {
    ...citeOptions,
    holdTrailingParagraphCitations: true,
  }

  let lastStreamedCitationSignature = ""

  const streamed = args.generateAnswer.stream({
    system,
    prompt: userPrompt,
    abortSignal: args.abortSignal,
  })

  for await (const partial of streamed.partials) {
    throwIfCanceled()

    if (typeof partial.insufficient === "boolean") {
      onPartial.insufficient?.(partial.insufficient)
    }

    const paragraphs = normalizeParagraphs(partial.paragraphs)

    if (typeof partial.insufficient === "boolean" && partial.insufficient) {
      onPartial.text?.(joinParagraphText(paragraphs))
    } else {
      const built = buildCitedMarkdown(
        paragraphs,
        allowed,
        streamingCiteOptions,
      )

      onPartial.text?.(normalizeNumberedCitedMarkdown(built.content))

      const citationSignature = JSON.stringify(
        built.citations.map((citation) => [
          citation.chunkId,
          citation.quote ?? "",
        ]),
      )

      if (citationSignature !== lastStreamedCitationSignature) {
        lastStreamedCitationSignature = citationSignature

        onPartial.citations?.(
          toAnswerCitationSlots(
            mapAnswerCitations({
              citations: built.citations,
              evidence: args.evidencePack.evidence,
              sourcesById: args.sourcesById,
              resolveQuotes: false,
            }),
            args.sourcesById,
          ),
        )
      }
    }
  }

  throwIfCanceled()

  let latestAnswer = await streamed.output

  throwIfCanceled()

  if (!latestAnswer) {
    throw new Error("No answer came back. Try again.")
  }

  let paragraphs = normalizeParagraphs(latestAnswer.paragraphs)
  let insufficient = latestAnswer.insufficient
  let built = buildCitedMarkdown(paragraphs, allowed, citeOptions)
  let missingSourceIds =
    !insufficient && args.evidencePack.mode === "corpus"
      ? findMissingCitationSourceIds(
          built.citations,
          args.evidencePack.evidence,
        )
      : []

  if (!insufficient && (built.invalid.length || missingSourceIds.length)) {
    const coverageInstruction = missingSourceIds.length
      ? `Your previous answer omitted these source IDs: ${missingSourceIds.join(", ")}. Include at least one paragraph and valid citation for every listed source.`
      : ""

    const retry = await args.generateAnswer.generateOnce({
      system: `${system}\nOnly cite these chunk IDs: ${[...allowed].join(", ")}\n${coverageInstruction}`,
      prompt: userPrompt,
      abortSignal: args.abortSignal,
    })

    throwIfCanceled()

    if (!retry) {
      throw new Error("No answer came back. Try again.")
    }

    latestAnswer = retry
    paragraphs = normalizeParagraphs(latestAnswer.paragraphs)
    insufficient = latestAnswer.insufficient
    built = buildCitedMarkdown(paragraphs, allowed, citeOptions)
    missingSourceIds =
      !insufficient && args.evidencePack.mode === "corpus"
        ? findMissingCitationSourceIds(
            built.citations,
            args.evidencePack.evidence,
          )
        : []
  }

  throwIfCanceled()
  onPartial.insufficient?.(insufficient)

  if (insufficient) {
    const content = joinParagraphText(paragraphs)

    if (!content.trim()) {
      throw new Error("No answer came back. Try again.")
    }

    onPartial.text?.(content)

    return {
      content,
      insufficient: true,
      citations: [],
      status: "complete",
    }
  }

  if (
    built.invalid.length ||
    missingSourceIds.length ||
    !built.content.trim()
  ) {
    return {
      content:
        parseCitationMarkers(built.content).text ||
        joinParagraphText(paragraphs),
      insufficient: false,
      citations: [],
      status: "failed",
      errorMessage: missingSourceIds.length
        ? "The answer didn't cover every selected source. Try again."
        : "The answer couldn't be verified against your sources. Try again.",
    }
  }

  const content = normalizeNumberedCitedMarkdown(built.content)
  const titled = mapAnswerCitations({
    citations: built.citations,
    evidence: args.evidencePack.evidence,
    sourcesById: args.sourcesById,
    resolveQuotes: true,
  })

  onPartial.text?.(content)
  onPartial.citations?.(toAnswerCitationSlots(titled, args.sourcesById))

  return {
    content,
    insufficient: false,
    citations: titled,
    status: "complete",
  }
}
