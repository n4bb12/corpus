import { markdownToPlainText } from "src/lib/markdownPlain"

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
  mdash: "—",
  ndash: "–",
  hellip: "…",
}

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const codePoint = Number.parseInt(hex, 16)

      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const codePoint = Number(dec)

      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _
    })
    .replace(/&([a-z]+);/gi, (match, name: string) => {
      return NAMED_ENTITIES[name.toLowerCase()] ?? match
    })
}

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
