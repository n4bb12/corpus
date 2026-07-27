import { markdownToPlainText } from "src/lib/markdownPlain"

export type CitationOffsetRange = {
  start: number
  end: number
}

function rangeOverlapsVisibleText(
  markdown: string,
  start: number,
  end: number,
) {
  const slice = markdown.slice(start, end)

  return /\S/.test(slice)
}

function findExcerptRange(
  markdown: string,
  excerpt: string,
): CitationOffsetRange | null {
  const needles = [
    excerpt,
    excerpt.trim(),
    markdownToPlainText(excerpt),
    excerpt.trim().slice(0, 96),
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

  return null
}

/** Prefer locator offsets; else search excerpt variants in the markdown. */
export function resolveCitationOffsets(
  markdown: string,
  locator?: CitationOffsetRange | null,
  excerpt?: string | null,
): CitationOffsetRange | null {
  if (
    locator &&
    typeof locator.start === "number" &&
    typeof locator.end === "number" &&
    locator.end > locator.start
  ) {
    const start = Math.max(0, locator.start)
    const end = Math.min(markdown.length, locator.end)

    if (end > start && rangeOverlapsVisibleText(markdown, start, end)) {
      return { start, end }
    }
  }

  if (typeof excerpt === "string" && excerpt.trim()) {
    return findExcerptRange(markdown, excerpt)
  }

  return null
}
