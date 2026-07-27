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

/** Prefer a ≥4-word plain line’s first sentence; else first line / fallback. */
export function titleFromMarkdown(markdown: string, fallback = "") {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => markdownToPlainText(line))
    .filter(Boolean)

  const line =
    lines.find((entry) => entry.split(/\s+/).length >= 4) ?? lines[0] ?? ""

  if (!line) {
    return fallback
  }

  const sentence = line.split(/(?<=[.!?])\s+/)[0] ?? line

  return normalizeTitle(sentence, fallback)
}
