import { useVirtualizer } from "@tanstack/react-virtual"
import { useEffect, useMemo, useRef } from "react"
import type { CitationOffsetRange } from "src/lib/citationHighlight"
import { renderMarkdownHtml } from "src/lib/renderMarkdown"
import { scheduleScrollOnce } from "src/lib/scheduleScrollOnce"
import {
  scrollTargetBlockStart,
  sourcePreviewBlocks,
} from "src/lib/sourcePreviewBlocks"
import { cn } from "src/lib/utils"

export type SourcePreviewArticleProps = {
  markdown: string
  resolvedOffsets: CitationOffsetRange | null
  scrollElement: HTMLDivElement | null
}

const ESTIMATED_BLOCK_SIZE = 96
const OVERSCAN = 8

export function SourcePreviewArticle({
  markdown,
  resolvedOffsets,
  scrollElement,
}: SourcePreviewArticleProps) {
  const blocks = useMemo(() => sourcePreviewBlocks(markdown), [markdown])
  const htmlCacheRef = useRef(new Map<number, string>())
  const scrolledKey = useRef<string | null>(null)
  const cacheBlocksRef = useRef(blocks)

  if (cacheBlocksRef.current !== blocks) {
    cacheBlocksRef.current = blocks
    htmlCacheRef.current = new Map()
    scrolledKey.current = null
  }

  const targetStart = resolvedOffsets
    ? scrollTargetBlockStart(blocks, resolvedOffsets)
    : undefined
  const targetIndex =
    typeof targetStart === "number"
      ? blocks.findIndex((block) => block.start === targetStart)
      : -1

  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => ESTIMATED_BLOCK_SIZE,
    overscan: OVERSCAN,
  })

  useEffect(() => {
    if (targetIndex < 0 || !resolvedOffsets || !scrollElement) {
      return
    }

    const key = `${resolvedOffsets.start}:${resolvedOffsets.end}:${blocks.length}`

    return scheduleScrollOnce({
      key,
      scrolledKey,
      isReady: () => scrollElement.clientHeight > 0,
      scroll: () => {
        virtualizer.scrollToIndex(targetIndex, {
          align: "center",
          behavior: "smooth",
        })
      },
    })
  }, [blocks.length, resolvedOffsets, scrollElement, targetIndex, virtualizer])

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <article
      className="prose prose-sm dark:prose-invert relative max-w-none"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualItems.map((item) => {
        const block = blocks[item.index]

        if (!block) {
          return null
        }

        const end = block.start + block.text.length
        const highlighted =
          !!resolvedOffsets &&
          block.start < resolvedOffsets.end &&
          end > resolvedOffsets.start

        let html = htmlCacheRef.current.get(block.start)

        if (!html) {
          html = renderMarkdownHtml(block.text)
          htmlCacheRef.current.set(block.start, html)
        }

        return (
          <div
            key={item.key}
            data-index={item.index}
            ref={virtualizer.measureElement}
            className="absolute top-0 left-0 w-full pb-4"
            style={{ transform: `translateY(${item.start}px)` }}
          >
            <div
              className={cn(
                "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                highlighted && "citation-highlight",
              )}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        )
      })}
    </article>
  )
}
