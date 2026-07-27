import { chunkContainsQuote, resolveCitationQuote } from "src/lib/citationQuote"

export const DIGEST_TARGET_MIN_CHARS = 400
export const DIGEST_TARGET_MAX_CHARS = 800
export const DIGEST_MAX_CITATIONS = 6

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

/** Heuristic: summary / brief / overview style corpus prompts. */
export function isCorpusSummaryPrompt(prompt: string) {
  return /\b(summar(?:y|ize|ise)|brief|overview|takeaways?|themes?|recap|tl;?dr)\b/i.test(
    prompt,
  )
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
