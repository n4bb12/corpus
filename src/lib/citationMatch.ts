/** Normalize text for citation matching (unicode, quotes, hyphens, whitespace). */
export function normalizeCitationText(text: string) {
  return text
    .normalize("NFC")
    .replace(/\u00ad/g, "")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function uniqueNeedles(needles: string[]) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const needle of needles) {
    const normalized = normalizeCitationText(needle)

    if (!normalized || seen.has(normalized)) {
      continue
    }

    seen.add(normalized)
    result.push(normalized)
  }

  return result
}

/** Longest word phrases first — helps when the model paraphrases one word. */
export function excerptSearchNeedles(excerpt: string) {
  const normalized = normalizeCitationText(excerpt)
  const needles = [excerpt, excerpt.trim(), normalized]

  const words = normalized.split(/\s+/).filter((word) => word.length > 0)

  for (let length = words.length; length >= 2; length -= 1) {
    for (let start = 0; start + length <= words.length; start += 1) {
      needles.push(words.slice(start, start + length).join(" "))
    }
  }

  return uniqueNeedles(needles)
}

function wordOverlapScore(haystack: string, quote: string) {
  const quoteWords = normalizeCitationText(quote)
    .split(/\s+/)
    .filter((word) => word.length > 1)

  if (!quoteWords.length) {
    return 0
  }

  const hayWords = new Set(
    normalizeCitationText(haystack)
      .split(/\s+/)
      .filter((word) => word.length > 1),
  )

  let hits = 0

  for (const word of quoteWords) {
    if (hayWords.has(word)) {
      hits += 1
    }
  }

  return hits / quoteWords.length
}

export function scoreQuoteOccurrence(
  chunkText: string,
  range: { start: number; end: number },
  quote: string,
) {
  const windowStart = Math.max(0, range.start - 48)
  const windowEnd = Math.min(chunkText.length, range.end + 48)
  const window = chunkText.slice(windowStart, windowEnd)

  return wordOverlapScore(window, quote)
}
