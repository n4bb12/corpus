import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react-dom"
import { useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CitationPill } from "src/components/chat/CitationPill"
import type { AnswerCitationSlot } from "src/lib/answerCitation"
import { markdownToPlainText } from "src/lib/markdownPlain"
import { formatTitle } from "src/lib/sourceTitle"

export type ChatCiteArgs = {
  sourceId?: string
  startOffset?: number
  endOffset?: number
  excerpt: string
  canNavigate: boolean
}

export type CitationPillsProps = {
  citations: AnswerCitationSlot[]
  indexes: number[]
  onCite: (args: ChatCiteArgs) => void
}

const CITATION_SIDE_OFFSET = 96
const CITATION_COLLISION_PADDING = 8

export function CitationPills({
  citations,
  indexes,
  onCite,
}: CitationPillsProps) {
  const uniqueIndexes = [...new Set(indexes)]
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const closeTimer = useRef<number | null>(null)
  const activeCitation = hoverIndex !== null ? citations[hoverIndex - 1] : null
  const open = hoverIndex !== null && !!activeCitation
  const displayTitle = activeCitation
    ? formatTitle(activeCitation.liveTitle)
    : ""
  const plainExcerpt = activeCitation
    ? markdownToPlainText(activeCitation.excerpt)
    : ""

  const { refs, floatingStyles } = useFloating({
    open,
    placement: "right",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(CITATION_SIDE_OFFSET),
      flip({
        padding: CITATION_COLLISION_PADDING,
        crossAxis: "alignment",
        fallbackAxisSideDirection: "start",
      }),
      shift({ padding: CITATION_COLLISION_PADDING }),
    ],
  })

  function clearCloseTimer() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function showCitation(index: number, element: HTMLButtonElement) {
    clearCloseTimer()
    refs.setReference(element)
    setHoverIndex(index)
  }

  function scheduleClose() {
    clearCloseTimer()
    closeTimer.current = window.setTimeout(() => {
      setHoverIndex(null)
      closeTimer.current = null
    }, 100)
  }

  function closeNow() {
    clearCloseTimer()
    setHoverIndex(null)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {uniqueIndexes.map((index) => {
        const citation = citations[index - 1]

        if (!citation) {
          return null
        }

        return (
          <CitationPill
            key={`${citation._id}-${index}`}
            index={index}
            title={formatTitle(citation.liveTitle)}
            canNavigate={citation.canNavigate}
            onHover={(element) => showCitation(index, element)}
            onLeave={scheduleClose}
            onOpen={() => {
              closeNow()
              onCite({
                sourceId: citation.sourceId,
                startOffset: citation.locator?.startOffset,
                endOffset: citation.locator?.endOffset,
                excerpt: citation.excerpt,
                canNavigate: citation.canNavigate,
              })
            }}
          />
        )
      })}

      {open
        ? createPortal(
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-50 flex w-auto max-w-sm flex-col gap-1.5 rounded-xl bg-popover p-3 text-sm text-popover-foreground shadow-(--shadow-pine) ring-1 ring-foreground/5 outline-hidden"
              onMouseEnter={clearCloseTimer}
              onMouseLeave={scheduleClose}
            >
              {activeCitation ? (
                <>
                  <p className="font-medium">{displayTitle}</p>
                  <p className="text-muted-foreground">{plainExcerpt}</p>
                  {!activeCitation.canNavigate ? (
                    <p className="text-xs text-muted-foreground">
                      Source deleted. Excerpt retained.
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
