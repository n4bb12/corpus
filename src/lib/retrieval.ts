export const EVIDENCE_CHARACTER_BUDGET = 12_000

/** Matches ingestion `minChunkSize` — used to bound per-source chunk reads. */
export const EVIDENCE_MIN_CHUNK_CHARACTERS = 80

/**
 * How many early-ordinal chunks to load per source when packing toward a
 * character budget. Sized so a fair share of the budget can be filled even
 * with minimum-sized chunks, without collecting entire large sources.
 */
export function maxChunksPerSourceForBudget(
  sourceCount: number,
  maxCharacters: number,
  minChunkCharacters = EVIDENCE_MIN_CHUNK_CHARACTERS,
) {
  if (sourceCount <= 0 || maxCharacters <= 0) {
    return 0
  }

  const share = Math.ceil(maxCharacters / sourceCount)

  return Math.max(3, Math.ceil(share / minChunkCharacters) + 1)
}

export type RetrievalCandidate = {
  chunkId: string
  sourceId: string
  text: string
  score: number
  channel: "vector" | "text" | "both" | "inline" | "coverage" | "digest"
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

/**
 * Pack evidence for corpus-wide tasks by round-robin across sources in
 * document order (early ordinals first), so each source gets fair coverage.
 */
export function packCoverageEvidence(
  chunks: InlineEvidenceChunk[],
  maxCharacters: number,
) {
  const bySource = new Map<string, InlineEvidenceChunk[]>()

  for (const chunk of chunks) {
    const list = bySource.get(chunk.sourceId)

    if (list) {
      list.push(chunk)
    } else {
      bySource.set(chunk.sourceId, [chunk])
    }
  }

  const queues = [...bySource.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, sourceChunks]) =>
      [...sourceChunks].sort((a, b) => a.ordinal - b.ordinal),
    )

  const selected: RetrievalCandidate[] = []
  let used = 0
  let cursor = 0

  while (queues.length) {
    const queue = queues[cursor]

    if (!queue) {
      break
    }

    const chunk = queue.shift()

    if (!chunk) {
      queues.splice(cursor, 1)

      if (queues.length) {
        cursor %= queues.length
      }

      continue
    }

    if (!queue.length) {
      queues.splice(cursor, 1)
    } else {
      cursor += 1
    }

    if (queues.length) {
      cursor %= queues.length
    }

    const next = used + chunk.text.length

    if (selected.length && next > maxCharacters) {
      continue
    }

    selected.push({
      ...chunk,
      score: 1 / (selected.length + 1),
      channel: "coverage",
    })
    used = next

    if (used >= maxCharacters) {
      break
    }
  }

  return selected
}
