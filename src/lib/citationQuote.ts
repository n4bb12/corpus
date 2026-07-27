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

function locateQuote(chunkText: string, quote: string) {
  const trimmed = quote.trim()

  if (!trimmed) {
    return null
  }

  const exact = chunkText.indexOf(trimmed)

  if (exact >= 0) {
    return { start: exact, end: exact + trimmed.length }
  }

  const collapsedChunk = collapseWithMap(chunkText)
  const collapsedQuote = trimmed.replace(/\s+/g, " ")
  const collapsedIndex = collapsedChunk.text.indexOf(collapsedQuote)

  if (collapsedIndex < 0) {
    return null
  }

  const start = collapsedChunk.map[collapsedIndex]
  const endIndex = collapsedIndex + collapsedQuote.length - 1
  const endOrigin = collapsedChunk.map[endIndex]

  if (typeof start !== "number" || typeof endOrigin !== "number") {
    return null
  }

  return { start, end: endOrigin + 1 }
}

/** Map a verbatim quote inside an evidence chunk to a tight source locator. */
export function resolveCitationQuote(
  input: CitationQuoteInput,
): CitationQuoteResult | null {
  const range = locateQuote(input.chunkText, input.quote)

  if (!range) {
    return null
  }

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
