import {
  excerptSearchNeedles,
  normalizeCitationText,
  scoreQuoteOccurrence,
} from "src/lib/citationMatch"
import {
  collapseMappedSpan,
  locateInMappedSpan,
  stripMarkdownWithMap,
} from "src/lib/markdownPlainMap"

export type CitationQuoteInput = {
  chunkText: string
  startOffset: number
  endOffset: number
  ordinal: number
  quote: string
}

export type CitationQuoteResult = {
  excerpt: string
  locator: {
    startOffset: number
    endOffset: number
    ordinal: number
  }
}

type CollapsedSpan = {
  text: string
  /** Collapsed char index → original char index in `chunkText`. */
  map: number[]
}

type QuoteRange = {
  start: number
  end: number
}

const MAX_QUOTE_SPAN_CHARS = 280

function collapseWithMap(text: string): CollapsedSpan {
  const chars: string[] = []
  const map: number[] = []
  let pendingSpace = false
  let started = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index)

    if (/\s/.test(char)) {
      if (started) {
        pendingSpace = true
      }

      continue
    }

    if (pendingSpace) {
      chars.push(" ")
      map.push(index - 1)
      pendingSpace = false
    }

    chars.push(char)
    map.push(index)
    started = true
  }

  return { text: chars.join(""), map }
}

function rangeFromCollapsed(
  span: CollapsedSpan,
  index: number,
  needleLength: number,
): QuoteRange | null {
  const start = span.map[index]
  const endIndex = index + needleLength - 1
  const endOrigin = span.map[endIndex]

  if (typeof start !== "number" || typeof endOrigin !== "number") {
    return null
  }

  return { start, end: endOrigin + 1 }
}

function pickBestRange(
  chunkText: string,
  quote: string,
  candidates: QuoteRange[],
) {
  let best: (QuoteRange & { score: number; length: number }) | null = null

  for (const range of candidates) {
    const length = range.end - range.start
    const score = scoreQuoteOccurrence(chunkText, range, quote)

    if (
      !best ||
      score > best.score ||
      (score === best.score && length > best.length)
    ) {
      best = { ...range, score, length }
    }
  }

  if (!best || best.score <= 0) {
    return best ? { start: best.start, end: best.end } : null
  }

  return { start: best.start, end: best.end }
}

function collectCollapsedMatches(
  span: CollapsedSpan,
  needle: string,
  chunkText: string,
  quote: string,
) {
  const collapsedNeedle = normalizeCitationText(needle)
  const candidates: QuoteRange[] = []
  let searchFrom = 0

  while (searchFrom < span.text.length) {
    const index = span.text.indexOf(collapsedNeedle, searchFrom)

    if (index < 0) {
      break
    }

    const range = rangeFromCollapsed(span, index, collapsedNeedle.length)

    if (range) {
      candidates.push(range)
    }

    searchFrom = index + 1
  }

  return pickBestRange(chunkText, quote, candidates)
}

function locateQuote(chunkText: string, quote: string) {
  const trimmed = normalizeCitationText(quote)

  if (!trimmed) {
    return null
  }

  const exactCandidates: QuoteRange[] = []
  let searchFrom = 0

  while (searchFrom < chunkText.length) {
    const index = chunkText.indexOf(trimmed, searchFrom)

    if (index < 0) {
      break
    }

    exactCandidates.push({ start: index, end: index + trimmed.length })
    searchFrom = index + 1
  }

  const exact = pickBestRange(chunkText, quote, exactCandidates)

  if (exact) {
    return exact
  }

  const collapsedChunk = collapseWithMap(chunkText)
  const collapsedQuote = trimmed.replace(/\s+/g, " ")
  const collapsed = collectCollapsedMatches(
    collapsedChunk,
    collapsedQuote,
    chunkText,
    quote,
  )

  if (collapsed) {
    return collapsed
  }

  const plainChunk = collapseMappedSpan(stripMarkdownWithMap(chunkText))

  for (const needle of excerptSearchNeedles(quote)) {
    const located = collectCollapsedMatches(
      plainChunk,
      needle,
      chunkText,
      quote,
    )

    if (located) {
      return located
    }
  }

  return locateInMappedSpan(plainChunk, trimmed)
}

function splitParagraphs(text: string) {
  const paragraphs: Array<{ start: number; end: number }> = []
  let blockStart = 0
  let offset = 0
  let inBlock = false

  for (const line of text.split("\n")) {
    const trimmed = line.trim()

    if (trimmed) {
      if (!inBlock) {
        blockStart = offset
        inBlock = true
      }
    } else if (inBlock) {
      paragraphs.push({ start: blockStart, end: offset })
      inBlock = false
    }

    offset += line.length + 1
  }

  if (inBlock) {
    paragraphs.push({ start: blockStart, end: text.length })
  }

  return paragraphs
}

/** Which blank-line paragraph inside a chunk contains this quote. */
export function passageIndexForQuote(chunkText: string, quote: string) {
  const located = locateQuote(chunkText, quote)

  if (!located) {
    return null
  }

  const paragraphs = splitParagraphs(chunkText)

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]

    if (
      paragraph &&
      located.start >= paragraph.start &&
      located.start < paragraph.end
    ) {
      return index
    }
  }

  return null
}

function longestNeedleInParagraph(paragraph: string, quote: string) {
  const collapsedQuote = normalizeCitationText(quote)
  const plainParagraph = collapseMappedSpan(
    stripMarkdownWithMap(paragraph),
  ).text

  if (!collapsedQuote || !plainParagraph) {
    return 0
  }

  let best = 0

  for (const needle of excerptSearchNeedles(quote)) {
    if (plainParagraph.includes(needle) && needle.length > best) {
      best = needle.length
    }
  }

  return best
}

function clampQuoteRange(chunkText: string, range: QuoteRange, quote: string) {
  const matched = chunkText.slice(range.start, range.end)
  const spansMultipleParagraphs = /\n\s*\n/.test(matched)

  if (!spansMultipleParagraphs && matched.length <= MAX_QUOTE_SPAN_CHARS) {
    return range
  }

  const paragraphs = splitParagraphs(matched)

  if (!paragraphs.length) {
    return range
  }

  const firstParagraph = paragraphs[0]

  if (!firstParagraph) {
    return range
  }

  let best = firstParagraph
  let bestScore = longestNeedleInParagraph(
    matched.slice(best.start, best.end),
    quote,
  )

  for (const paragraph of paragraphs.slice(1)) {
    const slice = matched.slice(paragraph.start, paragraph.end)
    const score = longestNeedleInParagraph(slice, quote)

    if (score > bestScore) {
      best = paragraph
      bestScore = score
    }
  }

  return {
    start: range.start + best.start,
    end: range.start + best.end,
  }
}

/** Map a verbatim quote inside an evidence chunk to a tight source locator. */
export function resolveCitationQuote(
  input: CitationQuoteInput,
): CitationQuoteResult | null {
  const located = locateQuote(input.chunkText, input.quote)

  if (!located) {
    return null
  }

  const range = clampQuoteRange(input.chunkText, located, input.quote)
  const startOffset = input.startOffset + range.start
  const endOffset = input.startOffset + range.end

  if (endOffset > input.endOffset || startOffset < input.startOffset) {
    return null
  }

  return {
    excerpt: input.chunkText.slice(range.start, range.end),
    locator: {
      startOffset,
      endOffset,
      ordinal: input.ordinal,
    },
  }
}
