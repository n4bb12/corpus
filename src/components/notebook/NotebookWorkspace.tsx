import { motion, useReducedMotion } from "motion/react"
import { ChatPane } from "src/components/chat/ChatPane"
import type { SourcePreviewHighlight } from "src/components/sources/SourcePreview"
import { SourcesPane } from "src/components/sources/SourcesPane"
import type { Id } from "src/convex/_generated/dataModel"
import {
  layoutTransition,
  pageEnterAnimate,
  pageEnterAnimateAside,
  pageEnterInitial,
  respectReducedMotion,
} from "src/lib/motion"
import { useMdUp } from "src/lib/useMdUp"
import { cn } from "src/lib/utils"

export type NotebookWorkspaceProps = {
  notebookId: string
  tab: "sources" | "chat"
  previewSourceId: string | null
  highlight: SourcePreviewHighlight | null
  addSourceOpen: boolean
  onPreviewSource: (sourceId: string | null) => void
  onAddSourceOpenChange: (open: boolean) => void
  onTabChange: (tab: "sources" | "chat") => void
  onExcerptOnly: (excerpt: string | null) => void
  onHighlight: (highlight: SourcePreviewHighlight | null) => void
}

export function NotebookWorkspace({
  notebookId,
  tab,
  previewSourceId,
  highlight,
  addSourceOpen,
  onPreviewSource,
  onAddSourceOpenChange,
  onTabChange,
  onExcerptOnly,
  onHighlight,
}: NotebookWorkspaceProps) {
  const reduceMotion = useReducedMotion()
  const mdUp = useMdUp()
  // Unmount while mobile sources tab hides chat so empty prompt re-enters on return.
  const emptyPromptMounted = mdUp || tab === "chat"

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <motion.aside
        className={cn(
          "flex min-h-0 w-full flex-col overflow-hidden border-r border-border/60 bg-[color-mix(in_oklab,var(--background)_70%,var(--card))] md:w-100 md:shrink-0",
          tab === "sources" ? "flex" : "hidden md:flex",
        )}
        initial={pageEnterInitial}
        animate={pageEnterAnimateAside}
        transition={respectReducedMotion(reduceMotion, layoutTransition)}
      >
        <SourcesPane
          notebookId={notebookId as Id<"notebooks">}
          previewSourceId={previewSourceId}
          highlight={highlight}
          onPreviewSource={(sourceId) => {
            onHighlight(null)
            onPreviewSource(sourceId)
          }}
          onExcerptFallback={onExcerptOnly}
          addOpen={addSourceOpen}
          onAddOpenChange={onAddSourceOpenChange}
        />
      </motion.aside>

      <motion.section
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background",
          tab === "chat" ? "flex" : "hidden md:flex",
        )}
        initial={pageEnterInitial}
        animate={pageEnterAnimate}
        transition={respectReducedMotion(reduceMotion, {
          ...layoutTransition,
          delay: 0.04,
        })}
      >
        <ChatPane
          notebookId={notebookId as Id<"notebooks">}
          emptyPromptMounted={emptyPromptMounted}
          onOpenSources={() => {
            onPreviewSource(null)
            onTabChange("sources")
          }}
          onAddSource={() => {
            onAddSourceOpenChange(true)
          }}
          onCite={({
            sourceId,
            startOffset,
            endOffset,
            excerpt,
            canNavigate,
          }) => {
            if (!canNavigate || !sourceId) {
              onExcerptOnly(excerpt)
              return
            }

            onPreviewSource(sourceId)
            onHighlight({
              start: typeof startOffset === "number" ? startOffset : undefined,
              end: typeof endOffset === "number" ? endOffset : undefined,
              excerpt,
            })
            onTabChange("sources")
          }}
        />
      </motion.section>
    </div>
  )
}
