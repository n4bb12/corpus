export const EVIDENCE_CHARACTER_BUDGET = 12_000

export type RetrievalCandidate = {
  chunkId: string
  sourceId: string
  text: string
  score: number
  channel: "vector" | "text" | "both" | "inline"
  startOffset: number
  endOffset: number
  ordinal: number
}

export type InlineEvidenceChunk = {
  chunkId: string
  sourceId: string
  text: string
  startOffset: number
  endOffset: number
  ordinal: number
}

/** True when known source sizes already exceed the evidence budget. */
export function sourcesExceedEvidenceBudget(
  characterCounts: Array<number | undefined>,
  maxCharacters: number,
) {
  let total = 0

  for (const count of characterCounts) {
    if (typeof count !== "number") {
      return false
    }

    total += count

    if (total > maxCharacters) {
      return true
    }
  }

  return false
}

/**
 * When every selected chunk fits the budget, return them all as evidence and
 * skip retrieval. Otherwise null so the caller can fall back to hybrid RAG.
 */
export function tryPackInlineEvidence(
  chunks: InlineEvidenceChunk[],
  maxCharacters: number,
) {
  let used = 0

  for (const chunk of chunks) {
    used += chunk.text.length

    if (used > maxCharacters) {
      return null
    }
  }

  return [...chunks]
    .sort((a, b) => {
      const sourceOrder = a.sourceId.localeCompare(b.sourceId)

      if (sourceOrder !== 0) {
        return sourceOrder
      }

      return a.ordinal - b.ordinal
    })
    .map(
      (chunk, index): RetrievalCandidate => ({
        ...chunk,
        score: 1 / (index + 1),
        channel: "inline",
      }),
    )
}

/** Union vector+text hits by chunkId; mark channel, keep max score, sort desc. */
export function mergeRetrievalCandidates(
  vectorHits: Array<Omit<RetrievalCandidate, "channel">>,
  textHits: Array<Omit<RetrievalCandidate, "channel">>,
) {
  const byId = new Map<string, RetrievalCandidate>()

  for (const hit of vectorHits) {
    byId.set(hit.chunkId, { ...hit, channel: "vector" })
  }

  for (const hit of textHits) {
    const existing = byId.get(hit.chunkId)

    if (!existing) {
      byId.set(hit.chunkId, { ...hit, channel: "text" })
      continue
    }

    byId.set(hit.chunkId, {
      ...existing,
      score: Math.max(existing.score, hit.score),
      channel: "both",
    })
  }

  return [...byId.values()].sort((a, b) => b.score - a.score)
}

/** Greedy pack of candidates until character budget is exhausted. */
export function selectEvidenceWithinBudget(
  candidates: RetrievalCandidate[],
  maxCharacters: number,
) {
  const selected: RetrievalCandidate[] = []
  let used = 0

  for (const candidate of candidates) {
    const next = used + candidate.text.length

    if (selected.length && next > maxCharacters) {
      continue
    }

    selected.push(candidate)
    used = next

    if (used >= maxCharacters) {
      break
    }
  }

  return selected
}
