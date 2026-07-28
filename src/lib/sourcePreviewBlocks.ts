import type { CitationOffsetRange } from "src/lib/citationHighlight"

export type SourcePreviewBlock = {
  text: string
  start: number
}

/** Split markdown into non-empty blocks with source-string offsets. */
export function sourcePreviewBlocks(content: string): SourcePreviewBlock[] {
  const blocks: SourcePreviewBlock[] = []
  let offset = 0
  let blockStart = 0
  let blockLines: string[] = []

  for (const line of content.split("\n")) {
    if (line.trim()) {
      if (!blockLines.length) {
        blockStart = offset
      }

      blockLines.push(line)
    } else if (blockLines.length) {
      blocks.push({
        text: blockLines.join("\n"),
        start: blockStart,
      })
      blockLines = []
    }

    offset += line.length + 1
  }

  if (blockLines.length) {
    blocks.push({
      text: blockLines.join("\n"),
      start: blockStart,
    })
  }

  return blocks
}

export function scrollTargetBlockStart(
  blocks: SourcePreviewBlock[],
  offsets: CitationOffsetRange,
) {
  const containing = blocks.find(({ text, start }) => {
    const end = start + text.length

    return start <= offsets.start && end > offsets.start
  })

  if (containing) {
    return containing.start
  }

  const overlapping = blocks.find(({ text, start }) => {
    const end = start + text.length

    return start < offsets.end && end > offsets.start
  })

  return overlapping?.start
}
