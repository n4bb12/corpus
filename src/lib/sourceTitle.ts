import { COMMON_HTML, EntityDecoder } from "@nodable/entities"
import { markdownToPlainText } from "src/lib/markdownPlain"

const htmlEntityDecoder = new EntityDecoder({ namedEntities: COMMON_HTML })

/** Decode numeric + common named HTML entities via @nodable/entities. */
export function decodeHtmlEntities(value: string) {
  return htmlEntityDecoder.decode(value)
}

/** Decode entities, collapse whitespace, truncate to 100 chars (or fallback). */
export function normalizeTitle(raw: string, fallback: string) {
  const collapsed = decodeHtmlEntities(raw).replace(/\s+/g, " ").trim()

  if (!collapsed) {
    return fallback
  }

  if (collapsed.length <= 100) {
    return collapsed
  }

  return collapsed.slice(0, 100).trimEnd()
}

export function formatTitle(raw: string) {
  return decodeHtmlEntities(raw).replace(/\s+/g, " ").trim()
}

export function looksLikeFilename(value: string) {
  const trimmed = value.trim()

  if (!trimmed || /\s/.test(trimmed)) {
    return false
  }

  return /\.[a-z0-9]{1,8}$/i.test(trimmed)
}

/** True for raw URLs or host/path labels like "biblebots.de/mission/". */
export function looksLikeUrl(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return false
  }

  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) {
    return true
  }

  // host/path with no spaces — e.g. example.com/docs or example.com/
  return /^[a-z0-9.-]+\.[a-z]{2,}([/:].*)?$/i.test(trimmed)
}

/** True when the label is mostly digits/codes with no real words (e.g. "32460 004"). */
export function looksLikeDocumentCode(value: string) {
  const letters = value.replace(/[^a-zA-ZÀ-ÿ]+/g, "")

  return letters.length < 3
}

export function titleFromPastedText(text: string) {
  const line = text
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find(Boolean)

  return normalizeTitle(line ?? "", "Pasted text")
}

export function titleFromUrl(url: string, htmlTitle?: string | null) {
  if (htmlTitle) {
    return normalizeTitle(htmlTitle, url)
  }

  try {
    const parsed = new URL(url)
    const path = parsed.pathname === "/" ? "" : parsed.pathname
    return normalizeTitle(`${parsed.hostname}${path}`, url)
  } catch {
    return normalizeTitle(url, "URL source")
  }
}

export function titleFromFilename(filename: string) {
  return normalizeTitle(filename, "Uploaded file")
}

const COMPACT_TITLE_MAX_WORDS = 5
const COMPACT_TITLE_MAX_CHARS = 48

/** Strip extension and turn `_` / `-` into spaces for a readable title. */
export function humanizeFilenameTitle(filename: string, fallback = "") {
  const base = filename
    .replace(/^.*[/\\]/, "")
    .replace(/\.[a-z0-9]{1,8}$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return compactTitle(base, fallback)
}

/** Prefer a humanized filename when the source title is filename-like. */
export function titleFromSourceLabel(raw: string, fallback = "") {
  if (looksLikeFilename(raw)) {
    return humanizeFilenameTitle(raw, fallback)
  }

  return compactTitle(raw, fallback)
}

/** Empty, trailing-label punctuation, or the untitled placeholder — not topical. */
export function isWeakTitle(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return true
  }

  if (/[:：]$/.test(trimmed)) {
    return true
  }

  return /^untitled(\s+notebook)?$/i.test(trimmed)
}

/**
 * True when the candidate is copied from a multi-word body sentence rather
 * than invented as a summary label. Short headings / document titles that also
 * appear in the source are allowed.
 */
export function isVerbatimSourcePhrase(title: string, markdown: string) {
  const needle = formatTitle(title).toLowerCase()

  if (!needle) {
    return false
  }

  const wordCount = needle.split(/\s+/).length

  // Document titles and short topical labels often appear as headings — keep them.
  if (
    wordCount <= COMPACT_TITLE_MAX_WORDS &&
    needle.length <= COMPACT_TITLE_MAX_CHARS
  ) {
    return false
  }

  const lines = markdown
    .split(/\r?\n/)
    .map((line) => markdownToPlainText(line).toLowerCase())
    .filter(Boolean)

  for (const line of lines) {
    const cleaned = line.replace(/[.!,…:;]+$/g, "").trim()

    if (cleaned === needle || line === needle) {
      return true
    }
  }

  return lines.join(" ").includes(needle)
}

/** Keep notebook titles short: first N words, soft char cap at a word boundary. */
export function compactTitle(raw: string, fallback = "") {
  const collapsed = decodeHtmlEntities(raw).replace(/\s+/g, " ").trim()

  if (!collapsed) {
    return fallback
  }

  const words = collapsed.split(" ")
  let result = ""

  for (const word of words.slice(0, COMPACT_TITLE_MAX_WORDS)) {
    const next = result ? `${result} ${word}` : word

    if (result && next.length > COMPACT_TITLE_MAX_CHARS) {
      break
    }

    result = next
  }

  return result || fallback
}

/** Prefer a short topical heading; skip label-like lines; else compact first line. */
export function titleFromMarkdown(markdown: string, fallback = "") {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => markdownToPlainText(line))
    .filter(Boolean)

  if (!lines.length) {
    return fallback
  }

  const heading = lines.find((entry) => {
    if (isWeakTitle(entry)) {
      return false
    }

    const wordCount = entry.split(/\s+/).length

    return (
      wordCount <= COMPACT_TITLE_MAX_WORDS &&
      entry.length <= COMPACT_TITLE_MAX_CHARS
    )
  })

  if (heading) {
    return compactTitle(heading, fallback)
  }

  const firstUseful = lines.find((entry) => !isWeakTitle(entry)) ?? ""

  return compactTitle(firstUseful, fallback)
}
