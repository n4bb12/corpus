const PAGE_MARKER_PATTERN = /(?:^|\n)\s*--\s*\d+\s+of\s+\d+\s*--\s*(?=\n|$)/g

/** Vertical gap (relative to line height) above which a paragraph break is inserted. */
const PARAGRAPH_GAP_RATIO = 1.6

/** Cluster text items whose Y differs by less than this into one line. */
const LINE_Y_TOLERANCE = 2

export type PdfTextItem = {
  str?: string
  hasEOL?: boolean
  transform?: number[]
  height?: number
  width?: number
}

type PdfLine = {
  y: number
  height: number
  text: string
}

export function cleanPdfText(text: string) {
  return text
    .replace(PAGE_MARKER_PATTERN, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function isUsefulPdfText(text: string) {
  const cleaned = cleanPdfText(text)

  if (cleaned.length < 40) {
    return false
  }

  return /[A-Za-zÀ-ÿ]{3,}/.test(cleaned)
}

function itemY(item: PdfTextItem) {
  const y = item.transform?.[5]

  return typeof y === "number" ? y : null
}

function itemX(item: PdfTextItem) {
  const x = item.transform?.[4]

  return typeof x === "number" ? x : 0
}

function itemHeight(item: PdfTextItem) {
  if (typeof item.height === "number" && item.height > 0) {
    return item.height
  }

  return 12
}

function looksLikeListMarker(text: string) {
  return (
    /^[•\-–—*]\s*/.test(text) ||
    /^\d+[.)]\s+\S/.test(text) ||
    /^[a-zà-ÿ][.)]\s+\S/.test(text) ||
    /^[a-zà-ÿ]\s+\S/.test(text) ||
    /^#{1,6}\s/.test(text)
  )
}

const TRAILING_WRAP_WORD =
  /\b(?:und|oder|sowie|and|or|the|a|an|of|to|for|with|im|in|am|zum|zur|von|vom)$/i

function looksLikeSoftWrap(previous: string, next: string) {
  const prev = previous.trimEnd()
  const nxt = next.trimStart()

  if (!prev || !nxt) {
    return false
  }

  if (looksLikeListMarker(nxt)) {
    return false
  }

  // Soft hyphen or end-of-line hyphenation: "Verwaltungs-" + "software"
  if (/[-\u00ad]$/.test(prev)) {
    return true
  }

  if (TRAILING_WRAP_WORD.test(prev)) {
    return true
  }

  if (/[a-zà-ÿ]$/.test(prev) && /^[a-zà-ÿ]/.test(nxt)) {
    return true
  }

  if (/[,;:]$/.test(prev)) {
    return true
  }

  // Mid-sentence wrap onto a capitalized word on a long line:
  // "… für die zukünftige" / "Arbeit strategisch …"
  if (/[a-zà-ÿ]$/.test(prev) && prev.length >= 50) {
    return true
  }

  if (!/[.!?:]$/.test(prev) && /^[a-zà-ÿ]/.test(nxt)) {
    return true
  }

  return false
}

function linesFromItems(items: PdfTextItem[]) {
  const lines: PdfLine[] = []
  let current: {
    y: number
    height: number
    parts: Array<{ x: number; str: string }>
  } | null = null

  const flush = () => {
    if (!current) {
      return
    }

    const text = current.parts
      .sort((a, b) => a.x - b.x)
      .map((part) => part.str)
      .join("")
      .replace(/[ \t]{2,}/g, " ")
      .trim()

    if (text) {
      lines.push({
        y: current.y,
        height: current.height,
        text,
      })
    }

    current = null
  }

  for (const item of items) {
    if (typeof item.str !== "string") {
      continue
    }

    const y = itemY(item)

    if (y === null) {
      continue
    }

    if (!current || Math.abs(current.y - y) > LINE_Y_TOLERANCE) {
      flush()
      current = {
        y,
        height: itemHeight(item),
        parts: [{ x: itemX(item), str: item.str }],
      }
      continue
    }

    current.height = Math.max(current.height, itemHeight(item))
    current.parts.push({ x: itemX(item), str: item.str })
  }

  flush()

  // PDF Y grows upward; reading order is top → bottom.
  return lines.sort((a, b) => b.y - a.y)
}

/**
 * Rebuild readable markdown-ish text from pdf.js text items.
 * Uses geometry (Y gaps) for paragraph breaks and unwraps soft line wraps.
 */
export function textFromPdfContentItems(items: PdfTextItem[]) {
  const positioned = items.filter((item) => itemY(item) !== null)

  if (!positioned.length) {
    return textFromPdfContentItemsFallback(items)
  }

  const lines = linesFromItems(positioned)

  if (!lines.length) {
    return ""
  }

  const heights = lines.map((line) => line.height).filter((h) => h > 0)
  const sortedHeights = [...heights].sort((a, b) => a - b)
  const medianHeight = sortedHeights[Math.floor(sortedHeights.length / 2)] ?? 12
  const paragraphGap = medianHeight * PARAGRAPH_GAP_RATIO

  const firstLine = lines[0]

  if (!firstLine) {
    return ""
  }

  let text = firstLine.text

  for (let index = 1; index < lines.length; index++) {
    const previous = lines[index - 1]
    const line = lines[index]

    if (!previous || !line) {
      continue
    }

    const gap = previous.y - line.y
    const localGap =
      Math.max(previous.height, line.height) * PARAGRAPH_GAP_RATIO
    const isParagraphGap = gap > paragraphGap || gap > localGap
    const softWrap = looksLikeSoftWrap(previous.text, line.text)
    const forceSoftWrapAcrossGap =
      TRAILING_WRAP_WORD.test(previous.text.trimEnd()) ||
      /[-\u00ad]$/.test(previous.text.trimEnd())

    if (softWrap && (!isParagraphGap || forceSoftWrapAcrossGap)) {
      const prevTrimmed = text.trimEnd()
      const nextTrimmed = line.text.trimStart()

      if (/[-\u00ad]$/.test(prevTrimmed) && /^[a-zà-ÿ]/.test(nextTrimmed)) {
        text = `${prevTrimmed.replace(/[-\u00ad]$/, "")}${nextTrimmed}`
      } else {
        text = `${prevTrimmed} ${nextTrimmed}`
      }

      continue
    }

    text += `\n\n${line.text}`
  }

  return text
}

/** Fallback when items lack transform matrices: hasEOL → newline, else space. */
function textFromPdfContentItemsFallback(items: PdfTextItem[]) {
  let text = ""

  for (const item of items) {
    if (typeof item.str !== "string") {
      continue
    }

    text += item.str

    if (item.hasEOL) {
      text += "\n"
    } else {
      text += " "
    }
  }

  return text
}
