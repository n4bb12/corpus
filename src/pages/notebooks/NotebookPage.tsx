import { motion, useReducedMotion } from "motion/react"
import { AppHeader } from "src/components/layout/AppHeader"
import { CitationExcerptPopover } from "src/components/notebook/CitationExcerptPopover"
import { InlineNotebookTitle } from "src/components/notebook/InlineNotebookTitle"
import { NotebookMobileTabs } from "src/components/notebook/NotebookMobileTabs"
import { NotebookWorkspace } from "src/components/notebook/NotebookWorkspace"
import {
  layoutTransition,
  pageEnterAnimate,
  pageEnterInitial,
  respectReducedMotion,
} from "src/lib/motion"
import { useNotebookPageData } from "src/pages/notebooks/useNotebookPageData"

export function NotebookPage() {
  const page = useNotebookPageData()
  const reduceMotion = useReducedMotion()

  return (
    <div className="atmosphere flex h-dvh flex-col overflow-hidden">
      <AppHeader
        email={page.session.data?.user.email}
        name={page.session.data?.user.name}
        notebookTitle={
          <motion.div
            initial={pageEnterInitial}
            animate={pageEnterAnimate}
            transition={respectReducedMotion(reduceMotion, layoutTransition)}
          >
            <InlineNotebookTitle
              title={page.notebook?.title ?? ""}
              loading={!page.notebook}
              onSave={async (title) => {
                const notebook = page.notebook

                if (!notebook) {
                  return
                }

                await page.rename({
                  notebookId: notebook._id,
                  title,
                })
              }}
            />
          </motion.div>
        }
      />

      <NotebookMobileTabs tab={page.tab} onTabChange={page.setTab} />

      <NotebookWorkspace
        notebookId={page.notebookId}
        tab={page.tab}
        previewSourceId={page.previewSourceId}
        highlight={page.highlight}
        addSourceOpen={page.addSourceOpen}
        onPreviewSource={page.setPreviewSourceId}
        onAddSourceOpenChange={page.setAddSourceOpen}
        onTabChange={page.setTab}
        onExcerptOnly={page.setExcerptOnly}
        onHighlight={page.setHighlight}
      />

      <CitationExcerptPopover
        excerpt={page.excerptOnly}
        onOpenChange={(open) => !open && page.setExcerptOnly(null)}
      />
    </div>
  )
}
