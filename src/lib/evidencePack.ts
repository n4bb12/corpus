import {
  formatCorpusEvidence,
  formatFlatEvidence,
} from "src/lib/evidencePrompt"
import type { RetrievalCandidate } from "src/lib/retrieval"
import {
  addMissingDigestCitationFallbacks,
  type DigestSection,
  formatDigestEvidence,
} from "src/lib/sourceDigest"

export type EvidenceItem = {
  chunkId: string
  sourceId: string
  text: string
  startOffset: number
  endOffset: number
  ordinal: number
}

export type PromptReadyEvidence = {
  evidence: EvidenceItem[]
  insufficient: boolean
  mode: "factual" | "corpus"
  evidenceKind?: "digest" | "coverage" | "chunks"
  digestSections?: DigestSection[]
  evidenceBlock: string
  systemAddendum: string
  useDigestEvidence: boolean
}

export type ReadyDigestRow = {
  sourceId: string
  title: string
  digestText: string
  digestCitations?: Array<{
    chunkId: string
    quote: string
    locator?: {
      startOffset: number
      endOffset: number
      ordinal: number
    }
  }>
}

export type DigestEvidenceChunk = {
  chunkId: string
  sourceId: string
  text: string
  startOffset: number
  endOffset: number
  ordinal: number
}

export type DigestEvidencePack = {
  evidence: RetrievalCandidate[]
  digestSections: DigestSection[]
  insufficient: boolean
  mode: "corpus"
  evidenceKind: "digest"
}

/**
 * Pure digest pack: ready digest rows + loaded chunks → Evidence pack body.
 */
export function buildDigestEvidencePack(
  ready: ReadyDigestRow[],
  citationChunks: DigestEvidenceChunk[],
  fallbackChunks: DigestEvidenceChunk[] = [],
): DigestEvidencePack | null {
  if (!ready.length) {
    return null
  }

  const chunkById = new Map(
    citationChunks.map((chunk) => [String(chunk.chunkId), chunk]),
  )

  let sections: DigestSection[] = ready.map((row) => ({
    sourceId: String(row.sourceId),
    title: row.title,
    digestText: row.digestText,
    citations: (row.digestCitations ?? []).flatMap((citation) => {
      const chunk = chunkById.get(String(citation.chunkId))

      if (!chunk) {
        return []
      }

      return [
        {
          chunkId: String(citation.chunkId),
          quote: citation.quote,
          ...(citation.locator ? { locator: citation.locator } : {}),
        },
      ]
    }),
  }))

  const evidence: RetrievalCandidate[] = []
  const seen = new Set<string>()

  for (const section of sections) {
    for (const citation of section.citations) {
      if (seen.has(citation.chunkId)) {
        continue
      }

      const chunk = chunkById.get(citation.chunkId)

      if (!chunk) {
        continue
      }

      seen.add(citation.chunkId)
      evidence.push({
        chunkId: String(chunk.chunkId),
        sourceId: String(chunk.sourceId),
        text: chunk.text,
        score: 1,
        channel: "digest",
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        ordinal: chunk.ordinal,
      })
    }
  }

  if (fallbackChunks.length) {
    for (const chunk of fallbackChunks) {
      const chunkId = String(chunk.chunkId)

      if (seen.has(chunkId)) {
        continue
      }

      seen.add(chunkId)
      evidence.push({
        chunkId,
        sourceId: String(chunk.sourceId),
        text: chunk.text,
        score: 1,
        channel: "digest",
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        ordinal: chunk.ordinal,
      })
    }

    sections = addMissingDigestCitationFallbacks(
      sections,
      fallbackChunks.map((chunk) => ({
        ...chunk,
        chunkId: String(chunk.chunkId),
        sourceId: String(chunk.sourceId),
      })),
    )
  }

  return {
    evidence,
    digestSections: sections,
    insufficient: !sections.length,
    mode: "corpus",
    evidenceKind: "digest",
  }
}

function toEvidenceItems(candidates: RetrievalCandidate[]): EvidenceItem[] {
  return candidates.map((item) => ({
    chunkId: String(item.chunkId),
    sourceId: String(item.sourceId),
    text: item.text,
    startOffset: item.startOffset,
    endOffset: item.endOffset,
    ordinal: item.ordinal,
  }))
}

export function makePromptReady(
  pack: {
    evidence: RetrievalCandidate[]
    insufficient: boolean
    mode: "factual" | "corpus"
    evidenceKind?: "digest" | "coverage" | "chunks"
    digestSections?: DigestSection[]
  },
  sourceIds: string[],
  sourceTitleById: Map<string, string>,
): PromptReadyEvidence {
  const evidence = toEvidenceItems(pack.evidence)
  const useDigestEvidence =
    pack.evidenceKind === "digest" && !!pack.digestSections?.length
  const distinctSourceCount = new Set(evidence.map((item) => item.sourceId))
    .size
  const useCorpusLayout =
    useDigestEvidence ||
    pack.mode === "corpus" ||
    (distinctSourceCount > 1 && pack.mode !== "factual")

  const evidenceBlock = useDigestEvidence
    ? formatDigestEvidence(pack.digestSections ?? [], sourceIds)
    : useCorpusLayout
      ? formatCorpusEvidence(evidence, sourceTitleById, sourceIds)
      : formatFlatEvidence(evidence)

  const sourceNames = sourceIds
    .map((sourceId) => {
      const title = sourceTitleById.get(sourceId)?.trim()

      return title || sourceId
    })
    .join("; ")

  const systemAddendum = useDigestEvidence
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

  return {
    evidence,
    insufficient: pack.insufficient,
    mode: pack.mode,
    evidenceKind: pack.evidenceKind,
    digestSections: pack.digestSections,
    evidenceBlock,
    systemAddendum,
    useDigestEvidence,
  }
}

/**
 * Pure Evidence pack strategy given mode and already-loaded candidates.
 * Prefers digest → coverage → chunks for corpus; chunks for factual.
 */
export function packEvidence(args: {
  mode: "factual" | "corpus"
  sourceIds: string[]
  sourceTitleById: Map<string, string>
  digestPack?: DigestEvidencePack | null
  coverage?: RetrievalCandidate[] | null
  chunks?: RetrievalCandidate[] | null
}): PromptReadyEvidence {
  if (args.mode === "corpus") {
    if (args.digestPack) {
      return makePromptReady(
        args.digestPack,
        args.sourceIds,
        args.sourceTitleById,
      )
    }

    if (args.coverage?.length) {
      return makePromptReady(
        {
          evidence: args.coverage,
          insufficient: !args.coverage.length,
          mode: "corpus",
          evidenceKind: "coverage",
        },
        args.sourceIds,
        args.sourceTitleById,
      )
    }
  }

  const chunks = args.chunks ?? []

  return makePromptReady(
    {
      evidence: chunks,
      insufficient: !chunks.length,
      mode: args.mode,
      evidenceKind: "chunks",
    },
    args.sourceIds,
    args.sourceTitleById,
  )
}
