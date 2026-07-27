import {
  excerptSearchNeedles,
  normalizeCitationText,
} from "src/lib/citationMatch"
import { markdownToPlainText } from "src/lib/markdownPlain"
import {
  collapseMappedSpan,
  locateInMappedSpan,
  stripMarkdownWithMap,
} from "src/lib/markdownPlainMap"

export type CitationOffsetRange = {
  start: number
  end: number
}

function plainSpan(markdown: string) {
  return normalizeCitationText(
    collapseMappedSpan(stripMarkdownWithMap(markdown)).text,
  )
}

function rangeOverlapsVisibleText(
  markdown: string,
  start: number,
  end: number,
) {
  const slice = markdown.slice(start, end)

  return /\S/.test(slice)
}

function locatorAlignsWithExcerpt(
  markdown: string,
  start: number,
  end: number,
  excerpt: string,
) {
  const excerptPlain = plainSpan(excerpt)

  if (!excerptPlain) {
    return true
  }

  const slicePlain = plainSpan(markdown.slice(start, end))

  if (!slicePlain) {
    return false
  }

  if (slicePlain.includes(excerptPlain) || excerptPlain.includes(slicePlain)) {
    return true
  }

  const excerptWords = excerptPlain
    .split(/\s+/)
    .filter((word) => word.length > 1)

  if (!excerptWords.length) {
    return true
  }

  let hits = 0

  for (const word of excerptWords) {
    if (slicePlain.includes(word)) {
      hits += 1
    }
  }

  return hits / excerptWords.length >= 0.6
}

function findExcerptRange(
  markdown: string,
  excerpt: string,
): CitationOffsetRange | null {
  const needles = [
    ...excerptSearchNeedles(excerpt),
    markdownToPlainText(excerpt),
  ]

  const seen = new Set<string>()

  for (const needle of needles) {
    if (!needle || seen.has(needle)) {
      continue
    }

    seen.add(needle)
    const index = markdown.indexOf(needle)

    if (index >= 0) {
      return {
        start: index,
        end:
          index +
          Math.min(needle.length, excerpt.trim().length || needle.length),
      }
    }
  }

  const plainMarkdown = collapseMappedSpan(stripMarkdownWithMap(markdown))

  for (const needle of needles) {
    if (!needle?.trim()) {
      continue
    }

    const located = locateInMappedSpan(plainMarkdown, needle)

    if (located) {
      return located
    }
  }

  return null
}

/** Prefer locator offsets; else search excerpt variants in the markdown. */
export function resolveCitationOffsets(
  markdown: string,
  locator?: CitationOffsetRange | null,
  excerpt?: string | null,
) {
  if (
    locator &&
    typeof locator.start === "number" &&
    typeof locator.end === "number" &&
    locator.end > locator.start
  ) {
    const start = Math.max(0, locator.start)
    const end = Math.min(markdown.length, locator.end)

    if (
      end > start &&
      rangeOverlapsVisibleText(markdown, start, end) &&
      (!excerpt?.trim() ||
        locatorAlignsWithExcerpt(markdown, start, end, excerpt))
    ) {
      return { start, end }
    }
  }

  if (typeof excerpt === "string" && excerpt.trim()) {
    return findExcerptRange(markdown, excerpt)
  }

  return null
}
