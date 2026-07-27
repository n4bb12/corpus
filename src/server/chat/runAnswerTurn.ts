import type { StreamCitation } from "src/lib/chatSse"
import { resolveCitationQuote } from "src/lib/citationQuote"
import {
  type AnswerParagraph,
  buildCitedMarkdown,
  type CitationRef,
  joinParagraphText,
  normalizeNumberedCitedMarkdown,
  parseCitationMarkers,
} from "src/lib/citations"
import {
  formatCorpusEvidence,
  formatFlatEvidence,
} from "src/lib/evidencePrompt"
import { formatDigestEvidence } from "src/lib/sourceDigest"
import { z } from "zod"

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

export type EvidenceItem = {
  chunkId: string
  sourceId: string
  text: string
  startOffset: number
  endOffset: number
  ordinal: number
}

export type DigestSection = {
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
}

export type EvidencePack = {
  evidence: EvidenceItem[]
  insufficient: boolean
  mode: "factual" | "corpus"
  evidenceKind?: "digest" | "coverage" | "chunks"
  digestSections?: DigestSection[]
}

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

function toStreamCitationCatalog(
  citations: PersistedAnswerCitation[],
  sourcesById: Map<string, SourceRecord | null | undefined>,
): StreamCitation[] {
  return citations.map((citation, order) => {
    const source = citation.sourceId ? sourcesById.get(citation.sourceId) : null

    return {
      _id: `answer-cite-${order}`,
      chunkId: String(citation.chunkId),
      sourceId: citation.sourceId,
      liveTitle: citation.sourceTitleSnapshot,
      excerpt: citation.excerpt,
      canNavigate: Boolean(source && !source.deletedAt),
      locator: citation.locator,
    }
  })
}

function buildPrompts(args: {
  evidencePack: EvidencePack
  sourceIds: string[]
  sourceTitleById: Map<string, string>
  history: Array<{
    user: { content?: string }
    assistant: { content?: string }
  }>
  prompt: string
}) {
  const distinctSourceCount = new Set(
    args.evidencePack.evidence.map((item) => item.sourceId),
  ).size
  const useDigestEvidence =
    args.evidencePack.evidenceKind === "digest" &&
    !!args.evidencePack.digestSections?.length
  const useCorpusLayout =
    useDigestEvidence ||
    args.evidencePack.mode === "corpus" ||
    (distinctSourceCount > 1 && args.evidencePack.mode !== "factual")

  const evidenceBlock = useDigestEvidence
    ? formatDigestEvidence(
        args.evidencePack.digestSections ?? [],
        args.sourceIds,
      )
    : useCorpusLayout
      ? formatCorpusEvidence(
          args.evidencePack.evidence,
          args.sourceTitleById,
          args.sourceIds,
        )
      : formatFlatEvidence(args.evidencePack.evidence)

  const historyText = args.history
    .map(
      (pair) =>
        `User: ${pair.user.content ?? ""}\nAssistant: ${pair.assistant.content ?? ""}`,
    )
    .join("\n\n")

  const sourceNames = args.sourceIds
    .map((sourceId) => {
      const title = args.sourceTitleById.get(sourceId)?.trim()

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

  const userPrompt = `Evidence:\n${evidenceBlock || "(none)"}\n\nRecent exchanges:\n${historyText || "(none)"}\n\nQuestion:\n${args.prompt}`

  return { system, userPrompt }
}

/**
 * Deep Answer turn: evidence + history + generation port → content + Citation catalog.
 */
export async function runAnswerTurn(args: {
  evidencePack: EvidencePack
  sourceIds: string[]
  sourcesById: Map<string, SourceRecord | null | undefined>
  sourceTitleById: Map<string, string>
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
    citations?: (citations: StreamCitation[]) => void
  }
}): Promise<AnswerTurnResult> {
  const throwIfCanceled = args.throwIfCanceled ?? (() => undefined)
  const onPartial = args.onPartial ?? {}

  const { system, userPrompt } = buildPrompts({
    evidencePack: args.evidencePack,
    sourceIds: args.sourceIds,
    sourceTitleById: args.sourceTitleById,
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
          toStreamCitationCatalog(
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

  if (!insufficient && built.invalid.length) {
    const retry = await args.generateAnswer.generateOnce({
      system: `${system}\nOnly cite these chunk IDs: ${[...allowed].join(", ")}`,
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

  if (built.invalid.length || !built.content.trim()) {
    return {
      content:
        parseCitationMarkers(built.content).text ||
        joinParagraphText(paragraphs),
      insufficient: false,
      citations: [],
      status: "failed",
      errorMessage:
        "The answer couldn't be verified against your sources. Try again.",
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
  onPartial.citations?.(toStreamCitationCatalog(titled, args.sourcesById))

  return {
    content,
    insufficient: false,
    citations: titled,
    status: "complete",
  }
}
