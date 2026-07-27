import { normalizeCitationText } from "src/lib/citationMatch"
import { passageIndexForQuote } from "src/lib/citationQuote"

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

export type BuildCitedMarkdownOptions = {
  /** chunkId markers work mid-stream with the evidence catalog; numbered markers are final. */
  markerStyle?: "chunkId" | "numbered"
  chunkTextById?: ReadonlyMap<string, string>
  /**
   * Structured answers stream citations after each paragraph's text.
   * Hold markers on the last paragraph until the next one starts or the stream ends.
   */
  holdTrailingParagraphCitations?: boolean
}

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

function passageKey(
  citation: AnswerCitation,
  chunkTextById?: ReadonlyMap<string, string>,
) {
  const chunkText = chunkTextById?.get(citation.chunkId)

  if (!chunkText) {
    return citation.chunkId
  }

  const index = passageIndexForQuote(chunkText, citation.quote)

  if (typeof index === "number") {
    return `${citation.chunkId}:${index}`
  }

  return citation.chunkId
}

/** One slot per source paragraph within an answer paragraph. */
export function dedupeParagraphCitations(
  citations: AnswerCitation[],
  chunkTextById?: ReadonlyMap<string, string>,
) {
  const kept: AnswerCitation[] = []

  for (const citation of citations) {
    const key = passageKey(citation, chunkTextById)
    const duplicateIndex = kept.findIndex(
      (existing) => passageKey(existing, chunkTextById) === key,
    )

    if (duplicateIndex < 0) {
      kept.push(citation)
      continue
    }

    const existing = kept[duplicateIndex]

    if (
      existing &&
      normalizeCitationText(citation.quote).length >
        normalizeCitationText(existing.quote).length
    ) {
      kept[duplicateIndex] = citation
    }
  }

  return kept
}

function trailingTextParagraphIndex(paragraphs: AnswerParagraph[]) {
  for (let index = paragraphs.length - 1; index >= 0; index -= 1) {
    if (paragraphs[index]?.text.trim()) {
      return index
    }
  }

  return -1
}

/**
 * Validate structured paragraph citations and inject cite markers.
 * Each citation entry becomes its own numbered slot (duplicate chunkIds allowed).
 */
export function buildCitedMarkdown(
  paragraphs: AnswerParagraph[],
  allowedChunkIds: Set<string>,
  options: BuildCitedMarkdownOptions = {},
) {
  const markerStyle = options.markerStyle ?? "chunkId"
  const citations: CitationRef[] = []
  const invalid: string[] = []
  const holdTrailing = !!options.holdTrailingParagraphCitations
  const holdParagraphIndex = holdTrailing
    ? trailingTextParagraphIndex(paragraphs)
    : -1

  const content = paragraphs
    .map((paragraph, index) => {
      const text = paragraph.text.trim()

      if (!text) {
        return ""
      }

      const isTrailing = holdTrailing && index === holdParagraphIndex

      if (isTrailing) {
        return text
      }

      const markers: string[] = []
      const paragraphCitations = dedupeParagraphCitations(
        paragraph.citations,
        options.chunkTextById,
      )

      for (const citation of paragraphCitations) {
        if (!allowedChunkIds.has(citation.chunkId)) {
          invalid.push(citation.chunkId)
          continue
        }

        citations.push({
          chunkId: citation.chunkId,
          quote: citation.quote,
        })

        if (markerStyle === "numbered") {
          markers.push(`[[cite:${citations.length}]]`)
        } else {
          markers.push(`[[cite:${citation.chunkId}]]`)
        }
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

export function normalizeNumberedCitedMarkdown(text: string) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function usesNumberedCitationMarkers(text: string) {
  if (!NUMBERED_CITATION_PATTERN.test(text)) {
    return false
  }

  for (const match of text.matchAll(CITATION_PATTERN)) {
    const raw = match[1]?.trim() ?? ""

    if (!raw || raw.includes(",")) {
      return false
    }

    if (!/^\d+$/.test(raw)) {
      return false
    }
  }

  return true
}

/** Collect `[[cite:id,…]]` markers → numbered `[[cite:n]]` + ordered refs. */
export function parseCitationMarkers(text: string) {
  if (usesNumberedCitationMarkers(text)) {
    return {
      text: normalizeNumberedCitedMarkdown(text),
      citations: [] as CitationRef[],
    }
  }

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
