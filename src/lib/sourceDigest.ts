import { chunkContainsQuote, resolveCitationQuote } from "src/lib/citationQuote"

export const DIGEST_TARGET_MIN_CHARS = 400
export const DIGEST_TARGET_MAX_CHARS = 800
export const DIGEST_MAX_CITATIONS = 6
export const DIGEST_MAX_INPUT_CHARS = 24_000
/** Enough for an 800-char digest with a little headroom; caps wasted generation. */
export const DIGEST_MAX_OUTPUT_TOKENS = 450
export const DIGEST_QUOTE_MAX_CHARS = 180

export type DigestChunk = {
  chunkId: string
  text: string
  startOffset: number
  endOffset: number
  ordinal: number
}

export type DigestCitationInput = {
  chunkId: string
  quote: string
}

export type DigestCitation = {
  chunkId: string
  quote: string
  locator?: {
    startOffset: number
    endOffset: number
    ordinal: number
  }
}

export type DigestSection = {
  sourceId: string
  title: string
  digestText: string
  citations: DigestCitation[]
}

export type DigestFallbackChunk = DigestChunk & {
  sourceId: string
}

const TOKEN_PATTERN = /[a-z0-9\u00c0-\u024f]{3,}/gi

function tokenize(text: string) {
  return new Set(
    (text.toLowerCase().match(TOKEN_PATTERN) ?? []).map((token) => token),
  )
}

function tokenOverlapScore(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) {
    return 0
  }

  let overlap = 0

  for (const token of right) {
    if (left.has(token)) {
      overlap += 1
    }
  }

  return overlap / Math.min(left.size, right.size)
}

function splitSentenceCandidates(text: string) {
  const trimmed = text.trim()

  if (!trimmed) {
    return []
  }

  const parts = trimmed
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) {
    return [trimmed.slice(0, DIGEST_QUOTE_MAX_CHARS).trim()].filter(Boolean)
  }

  return parts.flatMap((part) => {
    if (part.length <= DIGEST_QUOTE_MAX_CHARS) {
      return [part]
    }

    return [part.slice(0, DIGEST_QUOTE_MAX_CHARS).trim()].filter(Boolean)
  })
}

/**
 * Pick supporting quotes from chunks by lexical overlap with the digest.
 * Prefers diverse chunks; falls back to leading chunk excerpts when overlap is empty.
 */
export function selectExtractiveDigestCitations(
  digestText: string,
  chunks: DigestChunk[],
) {
  const digestTokens = tokenize(digestText)
  const ranked: Array<{ chunkId: string; quote: string; score: number }> = []

  for (const chunk of chunks) {
    for (const candidate of splitSentenceCandidates(chunk.text)) {
      if (candidate.length < 12) {
        continue
      }

      const score = tokenOverlapScore(digestTokens, tokenize(candidate))

      if (score <= 0) {
        continue
      }

      ranked.push({ chunkId: chunk.chunkId, quote: candidate, score })
    }
  }

  ranked.sort((left, right) => right.score - left.score)

  const picked: DigestCitationInput[] = []
  const usedChunkIds = new Set<string>()

  for (const candidate of ranked) {
    if (usedChunkIds.has(candidate.chunkId)) {
      continue
    }

    picked.push({ chunkId: candidate.chunkId, quote: candidate.quote })
    usedChunkIds.add(candidate.chunkId)

    if (picked.length >= DIGEST_MAX_CITATIONS) {
      break
    }
  }

  if (!picked.length) {
    for (const chunk of chunks) {
      const quote = chunk.text.slice(0, DIGEST_QUOTE_MAX_CHARS).trim()

      if (!quote) {
        continue
      }

      picked.push({ chunkId: chunk.chunkId, quote })

      if (picked.length >= DIGEST_MAX_CITATIONS) {
        break
      }
    }
  }

  return validateDigestCitations(
    picked,
    new Map(chunks.map((chunk) => [chunk.chunkId, chunk] as const)),
  )
}

export function addMissingDigestCitationFallbacks(
  sections: DigestSection[],
  chunks: DigestFallbackChunk[],
) {
  const chunksBySourceId = new Map<string, DigestFallbackChunk[]>()

  for (const chunk of chunks) {
    const sourceChunks = chunksBySourceId.get(chunk.sourceId)

    if (sourceChunks) {
      sourceChunks.push(chunk)
    } else {
      chunksBySourceId.set(chunk.sourceId, [chunk])
    }
  }

  return sections.map((section) => {
    if (section.citations.length) {
      return section
    }

    const citations = (chunksBySourceId.get(section.sourceId) ?? []).flatMap(
      (chunk) => {
        const quote = chunk.text.slice(0, DIGEST_QUOTE_MAX_CHARS).trim()

        return quote ? [{ chunkId: chunk.chunkId, quote }] : []
      },
    )

    return { ...section, citations }
  })
}

/**
 * Drop citations whose quotes cannot be found in the referenced chunk.
 * Attach locators when offsets are available.
 */
export function validateDigestCitations(
  citations: DigestCitationInput[],
  chunksById: Map<string, DigestChunk>,
) {
  const validated: DigestCitation[] = []

  for (const citation of citations) {
    const quote = citation.quote.trim()

    if (!quote || !citation.chunkId) {
      continue
    }

    const chunk = chunksById.get(citation.chunkId)

    if (!chunk || !chunkContainsQuote(chunk.text, quote)) {
      continue
    }

    const resolved = resolveCitationQuote({
      chunkText: chunk.text,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
      ordinal: chunk.ordinal,
      quote,
    })

    validated.push({
      chunkId: citation.chunkId,
      quote: resolved?.excerpt || quote,
      locator: resolved?.locator,
    })

    if (validated.length >= DIGEST_MAX_CITATIONS) {
      break
    }
  }

  return validated
}

export function clampDigestText(text: string) {
  const trimmed = text.trim()

  if (trimmed.length <= DIGEST_TARGET_MAX_CHARS) {
    return trimmed
  }

  const sliced = trimmed.slice(0, DIGEST_TARGET_MAX_CHARS)
  const sentenceBreak = Math.max(
    sliced.lastIndexOf(". "),
    sliced.lastIndexOf(".\n"),
  )

  if (sentenceBreak > DIGEST_TARGET_MIN_CHARS) {
    return sliced.slice(0, sentenceBreak + 1).trim()
  }

  const spaceBreak = sliced.lastIndexOf(" ")

  if (spaceBreak > DIGEST_TARGET_MIN_CHARS) {
    return sliced.slice(0, spaceBreak).trim()
  }

  return sliced.trim()
}

function buildDigestResult(digestText: string, chunks: DigestChunk[]) {
  const clamped = clampDigestText(digestText)

  if (!clamped) {
    return null
  }

  return {
    digestText: clamped,
    citations: selectExtractiveDigestCitations(clamped, chunks),
  }
}

/**
 * Short sources skip the LLM: the markdown itself is the digest.
 */
export function tryCheapSourceDigest(args: {
  markdown: string
  chunks: DigestChunk[]
}) {
  const trimmed = args.markdown.trim()

  if (!trimmed || trimmed.length > DIGEST_TARGET_MAX_CHARS) {
    return null
  }

  return buildDigestResult(trimmed, args.chunks)
}

export function digestFromModelText(text: string, chunks: DigestChunk[]) {
  return buildDigestResult(text, chunks)
}

/**
 * Format digests for corpus summary answers. Citations are the supporting
 * quotes stored at digest time (allowed chunk ids for the answer model).
 */
export function formatDigestEvidence(
  sections: DigestSection[],
  selectedSourceIds: string[],
) {
  if (!sections.length) {
    return "(none)"
  }

  const bySource = new Map(
    sections.map((section) => [section.sourceId, section]),
  )
  const orderedIds = [
    ...selectedSourceIds.filter((id) => bySource.has(id)),
    ...[...bySource.keys()].filter((id) => !selectedSourceIds.includes(id)),
  ]

  const parts: string[] = []
  let index = 0

  for (const sourceId of orderedIds) {
    const section = bySource.get(sourceId)

    if (!section) {
      continue
    }

    const title = section.title.trim() || "Untitled source"
    const quotes = section.citations.length
      ? section.citations
          .map((citation) => {
            index += 1
            return `[${index}] chunk:${citation.chunkId}\n${citation.quote}`
          })
          .join("\n\n")
      : "(no supporting quotes)"

    parts.push(
      `### ${title}\nsourceId:${sourceId}\n\nDigest:\n${section.digestText}\n\nSupporting quotes:\n${quotes}`,
    )
  }

  const missing = selectedSourceIds.filter((id) => !bySource.has(id))

  if (missing.length) {
    const labels = missing.map((id) => `- sourceId:${id}`)
    parts.push(`### Sources with no digest in this pack\n${labels.join("\n")}`)
  }

  return parts.join("\n\n")
}
