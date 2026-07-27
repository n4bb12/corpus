export type ChunkMarkdownOptions = {
  maxChunkSize: number
  minChunkSize: number
}

/** Split markdown into structural blocks (headings, fences, paragraphs). */
function segmentMarkdown(text: string) {
  const segments: string[] = []
  let current: string[] = []
  let inFence = false

  const flush = () => {
    const joined = current.join("\n").trim()

    if (joined) {
      segments.push(joined)
    }

    current = []
  }

  for (const line of text.split(/\r?\n/)) {
    const isFence = /^(```|~~~)/.test(line.trim())

    if (isFence) {
      if (inFence) {
        current.push(line)
        inFence = false
        flush()
      } else {
        flush()
        current.push(line)
        inFence = true
      }

      continue
    }

    if (inFence) {
      current.push(line)
      continue
    }

    if (/^#{1,6}\s/.test(line)) {
      flush()
      current.push(line)
      continue
    }

    if (/^\s*$/.test(line)) {
      flush()
      continue
    }

    current.push(line)
  }

  flush()

  return segments
}

/** Hard-split an oversized segment on character boundaries. */
function splitOversized(segment: string, maxChunkSize: number) {
  if (segment.length <= maxChunkSize) {
    return [segment]
  }

  const parts: string[] = []
  let start = 0

  while (start < segment.length) {
    parts.push(segment.slice(start, start + maxChunkSize))
    start += maxChunkSize
  }

  return parts
}

/**
 * Chunk markdown by structure (headings, fences, paragraphs), then pack by
 * character size. No embedding or model calls.
 */
export function chunkMarkdown(
  markdown: string,
  { maxChunkSize, minChunkSize }: ChunkMarkdownOptions,
) {
  const segments = segmentMarkdown(markdown).flatMap((segment) =>
    splitOversized(segment, maxChunkSize),
  )

  if (!segments.length) {
    return []
  }

  const chunks: string[] = []
  let current = ""

  for (const segment of segments) {
    if (!current) {
      current = segment
      continue
    }

    const joined = `${current}\n\n${segment}`

    if (joined.length <= maxChunkSize) {
      current = joined
      continue
    }

    if (current.length < minChunkSize && chunks.length) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}\n\n${current}`
      current = segment
      continue
    }

    chunks.push(current)
    current = segment
  }

  if (current) {
    if (current.length < minChunkSize && chunks.length) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}\n\n${current}`
    } else {
      chunks.push(current)
    }
  }

  return chunks
}
