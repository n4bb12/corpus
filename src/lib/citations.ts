export type CitationRef = {
  chunkId: string
  excerpt?: string
  quote?: string
}

export type AnswerCitation = {
  chunkId: string
  quote: string
}

export type AnswerParagraph = {
  text: string
  citations: AnswerCitation[]
}

const CITATION_PATTERN = /\[\[cite:([^\]]+)\]\]/g
const NUMBERED_CITATION_PATTERN = /\[\[cite:(\d+)\]\]/g

/** Join paragraph texts for streaming display before markers are injected. */
export function joinParagraphText(
  paragraphs: Array<{ text?: string } | undefined> | undefined,
) {
  if (!paragraphs?.length) {
    return ""
  }

  return paragraphs
    .map((paragraph) => paragraph?.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n")
}

/**
 * Validate structured paragraph citations and inject `[[cite:chunkId]]` markers.
 * First-seen valid chunk order is preserved in `citations` for later numbering.
 */
export function buildCitedMarkdown(
  paragraphs: AnswerParagraph[],
  allowedChunkIds: Set<string>,
) {
  const citations: CitationRef[] = []
  const invalid: string[] = []
  const seen = new Set<string>()

  const content = paragraphs
    .map((paragraph) => {
      const text = paragraph.text.trim()

      if (!text) {
        return ""
      }

      const markers: string[] = []

      for (const citation of paragraph.citations) {
        if (!allowedChunkIds.has(citation.chunkId)) {
          invalid.push(citation.chunkId)
          continue
        }

        if (!seen.has(citation.chunkId)) {
          seen.add(citation.chunkId)
          citations.push({
            chunkId: citation.chunkId,
            quote: citation.quote,
          })
        }

        markers.push(`[[cite:${citation.chunkId}]]`)
      }

      if (!markers.length) {
        return text
      }

      return `${text} ${markers.join(" ")}`
    })
    .filter(Boolean)
    .join("\n\n")

  return { content, citations, invalid }
}

/** Collect `[[cite:id,…]]` markers → numbered `[[cite:n]]` + ordered refs. */
export function parseCitationMarkers(text: string) {
  const refs: CitationRef[] = []
  const cleaned = text.replace(CITATION_PATTERN, (_match, rawIds: string) => {
    const ids = rawIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)

    const markers: string[] = []

    for (const chunkId of ids) {
      let order = refs.findIndex((ref) => ref.chunkId === chunkId)

      if (order < 0) {
        refs.push({ chunkId })
        order = refs.length - 1
      }

      markers.push(`[[cite:${order + 1}]]`)
    }

    return markers.join(" ")
  })

  return {
    text: cleaned
      .replace(/[ \t]+\n/g, "\n")
      .replace(/ {2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    citations: refs,
  }
}

export function stripCitationMarkers(text: string) {
  return text
    .replace(CITATION_PATTERN, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
}

/** Drop invalid numbered cites; renumber survivors to a dense 1…n sequence. */
export function remapCitationMarkers(
  text: string,
  citations: CitationRef[],
  valid: CitationRef[],
) {
  const validIds = new Set(valid.map((citation) => citation.chunkId))
  const oldToNew = new Map<number, number>()
  let next = 1

  citations.forEach((citation, index) => {
    if (validIds.has(citation.chunkId)) {
      oldToNew.set(index + 1, next)
      next += 1
    }
  })

  return text
    .replace(NUMBERED_CITATION_PATTERN, (_match, rawIndex: string) => {
      const mapped = oldToNew.get(Number(rawIndex))

      return mapped ? ` [[cite:${mapped}]]` : ""
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/ +/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Split on blank lines; peel trailing `[[cite:n]]` indexes off each paragraph. */
export function splitCitedParagraphs(markdown: string) {
  const paragraphs = markdown.split(/\n\n+/)

  return paragraphs
    .map((paragraph) => {
      const citationIndexes: number[] = []
      const text = paragraph
        .replace(NUMBERED_CITATION_PATTERN, (_match, rawIndex: string) => {
          const index = Number(rawIndex)

          if (Number.isFinite(index) && index > 0) {
            citationIndexes.push(index)
          }

          return ""
        })
        .replace(/[ \t]+$/gm, "")
        .trim()

      return { text, citationIndexes }
    })
    .filter((paragraph) => paragraph.text || paragraph.citationIndexes.length)
}

export function validateCitations(
  citations: CitationRef[],
  allowedChunkIds: Set<string>,
) {
  const valid = citations.filter((citation) =>
    allowedChunkIds.has(citation.chunkId),
  )
  const invalid = citations.filter(
    (citation) => !allowedChunkIds.has(citation.chunkId),
  )

  return { valid, invalid }
}

/** Append rotating `[[cite:chunkId]]` to substantial prose paragraphs. */
export function attachParagraphCitations(
  markdown: string,
  orderedChunkIds: string[],
) {
  if (!orderedChunkIds.length) {
    return markdown
  }

  const paragraphs = markdown.split(/\n\n+/)
  let cursor = 0

  return paragraphs
    .map((paragraph) => {
      const trimmed = paragraph.trim()

      if (!trimmed) {
        return paragraph
      }

      if (/^(#{1,6}\s|>|[-*]\s|\d+\.\s)/.test(trimmed)) {
        return paragraph
      }

      if (trimmed.length < 40) {
        return paragraph
      }

      const chunkId = orderedChunkIds[cursor % orderedChunkIds.length]

      if (typeof chunkId !== "string") {
        return paragraph
      }

      cursor += 1
      return `${paragraph} [[cite:${chunkId}]]`
    })
    .join("\n\n")
}
