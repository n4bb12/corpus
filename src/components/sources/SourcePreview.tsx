import { ArrowLeft } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { SourcePreviewArticle } from "src/components/sources/SourcePreviewArticle"
import { Button } from "src/components/ui/shadcn/button"
import { ScrollArea } from "src/components/ui/shadcn/scroll-area"
import {
  type CitationOffsetRange,
  resolveCitationOffsets,
} from "src/lib/citationHighlight"
import { formatTitle } from "src/lib/sourceTitle"

export type SourcePreviewHighlight = {
  start?: number
  end?: number
  excerpt: string
}

export type SourcePreviewProps = {
  title: string
  markdown: string | null
  highlight?: SourcePreviewHighlight | null
  onBack: () => void
  onHighlightUnresolved?: (excerpt: string) => void
}

const PREVIEW_PLACEHOLDER_BLOCKS = [
  "Loading the first passage of this source while the text is prepared for reading.",
  "A second block keeps the preview layout stable until the real markdown arrives.",
  "Shorter line.",
  "Another paragraph approximates typical source density without inventing a separate skeleton layout.",
] as const

function locatorFromHighlight(
  highlight?: SourcePreviewHighlight | null,
): CitationOffsetRange | null {
  if (
    !highlight ||
    typeof highlight.start !== "number" ||
    typeof highlight.end !== "number"
  ) {
    return null
  }

  return { start: highlight.start, end: highlight.end }
}

export function SourcePreview({
  title,
  markdown,
  highlight,
  onBack,
  onHighlightUnresolved,
}: SourcePreviewProps) {
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  )
  const unresolvedKey = useRef<string | null>(null)
  const resolvedOffsets = useMemo(() => {
    if (!markdown || !highlight) {
      return null
    }

    return resolveCitationOffsets(
      markdown,
      locatorFromHighlight(highlight),
      highlight.excerpt,
    )
  }, [highlight, markdown])

  useEffect(() => {
    if (!markdown || !highlight) {
      return
    }

    if (resolvedOffsets) {
      unresolvedKey.current = null
      return
    }

    const key = `${highlight.excerpt}:${markdown.length}`

    if (unresolvedKey.current === key) {
      return
    }

    unresolvedKey.current = key
    onHighlightUnresolved?.(highlight.excerpt)
  }, [highlight, markdown, onHighlightUnresolved, resolvedOffsets])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="z-10 flex shrink-0 items-center gap-2 border-b border-border bg-background/95 p-4 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-sm"
          onClick={onBack}
        >
          <ArrowLeft size={16} className="mr-1" />
          Back
        </Button>
        <div className="min-w-0 flex-1 truncate font-medium">
          {formatTitle(title)}
        </div>
      </div>
      <ScrollArea
        className="min-h-0 flex-1 overflow-hidden"
        viewportRef={setScrollElement}
      >
        <div className="p-4 sm:p-6">
          {markdown ? (
            <SourcePreviewArticle
              markdown={markdown}
              resolvedOffsets={resolvedOffsets}
              scrollElement={scrollElement}
            />
          ) : (
            <>
              <span className="sr-only" role="status">
                Loading source
              </span>
              <article
                className="prose prose-sm dark:prose-invert max-w-none space-y-4"
                aria-busy="true"
                aria-hidden
              >
                {PREVIEW_PLACEHOLDER_BLOCKS.map((text) => (
                  <p key={text} className="rounded-lg placeholder-shimmer">
                    {text}
                  </p>
                ))}
              </article>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
