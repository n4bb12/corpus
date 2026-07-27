import type { StreamCitation } from "src/lib/chatSse"
import { resolveCitationQuote } from "src/lib/citationQuote"
import type { CitationRef } from "src/lib/citations"

type EvidenceItem = {
  chunkId: unknown
  sourceId: unknown
  text: string
  startOffset: number
  endOffset: number
  ordinal: number
}

type SourceRecord = {
  title: string
  deletedAt?: number | null
}

export type PersistedAnswerCitation = {
  sourceId: unknown
  chunkId: unknown
  sourceTitleSnapshot: string
  excerpt: string
  locator?: {
    startOffset: number
    endOffset: number
    ordinal: number
  }
  order: number
}

export function mapAnswerCitations(args: {
  citations: CitationRef[]
  evidence: EvidenceItem[]
  sourcesById: Map<unknown, SourceRecord | null>
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

    const source = evidence ? args.sourcesById.get(evidence.sourceId) : null

    const excerpt =
      resolved?.excerpt || quote || evidence?.text.slice(0, 400) || ""

    return {
      sourceId: evidence?.sourceId,
      chunkId: citation.chunkId,
      sourceTitleSnapshot: source?.title || excerpt.slice(0, 48) || "Source",
      excerpt,
      locator: resolved?.locator,
      order,
    } satisfies PersistedAnswerCitation
  })
}

export function toStreamCitationCatalog(
  citations: PersistedAnswerCitation[],
  sourcesById: Map<unknown, SourceRecord | null>,
): StreamCitation[] {
  return citations.map((citation, order) => {
    const source = citation.sourceId ? sourcesById.get(citation.sourceId) : null

    return {
      _id: `answer-cite-${order}`,
      chunkId: String(citation.chunkId),
      sourceId: citation.sourceId as string | undefined,
      liveTitle: citation.sourceTitleSnapshot,
      excerpt: citation.excerpt,
      canNavigate: Boolean(source && !source.deletedAt),
      locator: citation.locator,
    }
  })
}
