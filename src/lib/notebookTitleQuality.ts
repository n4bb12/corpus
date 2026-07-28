import {
  fallbackTitleFromDigest,
  formatTitle,
  isWeakTitle,
  looksLikeDocumentCode,
  looksLikeFilename,
  looksLikeUrl,
} from "src/lib/sourceTitle"

const FALLBACK_STOP_WORDS = new Set([
  "about",
  "across",
  "after",
  "also",
  "among",
  "article",
  "beschreibt",
  "describe",
  "described",
  "describes",
  "discuss",
  "discussed",
  "discusses",
  "document",
  "documented",
  "documents",
  "durch",
  "eine",
  "einer",
  "eines",
  "examines",
  "from",
  "into",
  "paper",
  "present",
  "presented",
  "presents",
  "report",
  "reported",
  "reports",
  "source",
  "study",
  "studies",
  "their",
  "these",
  "this",
  "über",
  "with",
])

/** Vague, truncated, or non-topical notebook titles. */
export function isLowQualityNotebookTitle(value: string) {
  const trimmed = formatTitle(value)

  if (!trimmed) {
    return true
  }

  if (
    isWeakTitle(trimmed) ||
    looksLikeFilename(trimmed) ||
    looksLikeUrl(trimmed) ||
    looksLikeDocumentCode(trimmed)
  ) {
    return true
  }

  // Trailing single-letter initial: "The excerpt from J."
  if (/\b[A-ZÀ-Ÿ]\.$/.test(trimmed)) {
    return true
  }

  // Generic document-ish openers that aren't a topic
  if (
    /^(the\s+)?(excerpt|extract|passage|snippet|selection|text|document|notes?|source|file|pdf|paper|article)\b/i.test(
      trimmed,
    )
  ) {
    return true
  }

  // A compacted source label may end on punctuation or a connective word.
  if (
    /(?:[&|/:—–-]|\b(?:about|and|for|from|or|with|für|mit|oder|und|von))$/i.test(
      trimmed,
    )
  ) {
    return true
  }

  const letters = trimmed.replace(/[^a-zA-ZÀ-ÿ]+/g, "")

  if (letters.length < 8) {
    return true
  }

  return false
}

export function isUsableNotebookTitle(value: string) {
  return !isLowQualityNotebookTitle(value)
}

/** True when the title is just one source's label in a multi-source notebook. */
export function isSingleSourceNotebookTitle(
  title: string,
  sourceLabels: string[],
) {
  if (sourceLabels.length < 2) {
    return false
  }

  const needle = comparisonTitle(title)

  if (!needle) {
    return false
  }

  return sourceLabels.some((label) => {
    const normalized = comparisonTitle(label)

    return !!normalized && normalized.includes(needle)
  })
}

function comparisonTitle(value: string) {
  return formatTitle(value)
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

/**
 * When the model fails and there are several sources, prefer a short join of
 * distinct labels over latching onto one filename/digest line.
 */
export function multiSourceFallbackTitle(sourceLabels: string[]) {
  const unique: string[] = []

  for (const label of sourceLabels) {
    const trimmed = formatTitle(label)

    if (
      !isUsableNotebookTitle(trimmed) ||
      trimmed.length > 40 ||
      trimmed.split(/\s+/).length > 5
    ) {
      continue
    }

    if (unique.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) {
      continue
    }

    unique.push(trimmed)

    if (unique.length >= 2) {
      break
    }
  }

  if (unique.length >= 2) {
    return `${unique[0]} & ${unique[1]}`
  }

  return sourceLabels.length === 1 ? (unique[0] ?? "") : ""
}

export function fallbackNotebookTitle(args: {
  sourceLabels: string[]
  digests: string[]
}) {
  const labelFallback = multiSourceFallbackTitle(args.sourceLabels)

  if (labelFallback) {
    return labelFallback
  }

  if (args.digests.length === 1) {
    return fallbackTitleFromDigest(args.digests[0] ?? "", "")
  }

  const terms = sharedDigestTerms(args.digests)

  if (terms.length) {
    return `${terms.map(titleCase).join(" ")} Studies`
  }

  return args.digests.length ? "Research Collection" : ""
}

function sharedDigestTerms(digests: string[]) {
  const documentCounts = new Map<string, number>()
  const firstPositions = new Map<string, number>()
  let position = 0

  for (const digest of digests) {
    const documentTerms = new Set<string>()
    const words = digest.match(/[\p{L}\p{N}]+/gu) ?? []

    for (const word of words) {
      const normalized = normalizeFallbackTerm(word)

      if (!normalized || documentTerms.has(normalized)) {
        continue
      }

      documentTerms.add(normalized)
      documentCounts.set(normalized, (documentCounts.get(normalized) ?? 0) + 1)

      if (!firstPositions.has(normalized)) {
        firstPositions.set(normalized, position)
      }

      position += 1
    }
  }

  return [...documentCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => {
      const countDifference = right[1] - left[1]

      if (countDifference) {
        return countDifference
      }

      return (
        (firstPositions.get(left[0]) ?? 0) - (firstPositions.get(right[0]) ?? 0)
      )
    })
    .slice(0, 3)
    .map(([term]) => term)
}

function normalizeFallbackTerm(word: string) {
  let normalized = word.toLocaleLowerCase()

  if (
    normalized.length > 4 &&
    normalized.endsWith("s") &&
    normalized !== "species"
  ) {
    normalized = normalized.slice(0, -1)
  }

  if (
    normalized.length < 4 ||
    FALLBACK_STOP_WORDS.has(normalized) ||
    /^\d+$/.test(normalized)
  ) {
    return ""
  }

  return normalized
}

function titleCase(value: string) {
  return `${value.charAt(0).toLocaleUpperCase()}${value.slice(1)}`
}
