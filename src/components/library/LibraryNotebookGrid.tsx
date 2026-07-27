import { formatDistanceToNow } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useRef } from "react"
import { AddNotebookCard } from "src/components/library/AddNotebookCard"
import { NotebookCard } from "src/components/library/NotebookCard"
import { Button } from "src/components/ui/shadcn/button"
import type { Id } from "src/convex/_generated/dataModel"
import {
  fadeTransition,
  layoutTransition,
  respectReducedMotion,
} from "src/lib/motion"
import { cn } from "src/lib/utils"

export type LibraryNotebook = {
  _id: string
  title: string
  lastUsedAt: number
  sourceCount: number
}

export type LibraryNotebookGridProps = {
  page: LibraryNotebook[]
  searchQuery?: string
  isFirstPage: boolean
  creating: boolean
  showPagination: boolean
  currentPage: number
  pageCount: number
  canGoPrevious: boolean
  canGoNext: boolean
  onCreate: () => void
  onPrevious: () => void
  onNext: () => void
  onRename: (notebookId: Id<"notebooks">, title: string) => Promise<void>
  onDelete: (notebookId: Id<"notebooks">) => Promise<void>
}

const PAGE_SLIDE_OFFSET = 28

export function LibraryNotebookGrid({
  page,
  searchQuery,
  isFirstPage,
  creating,
  showPagination,
  currentPage,
  pageCount,
  canGoPrevious,
  canGoNext,
  onCreate,
  onPrevious,
  onNext,
  onRename,
  onDelete,
}: LibraryNotebookGridProps) {
  const reduceMotion = useReducedMotion()
  const previousPageRef = useRef(currentPage)
  const directionRef = useRef(0)
  // First paint must not start at opacity 0 under the page chrome.
  const skipEnterRef = useRef(true)

  useEffect(() => {
    skipEnterRef.current = false
  }, [])

  if (previousPageRef.current !== currentPage) {
    directionRef.current = currentPage > previousPageRef.current ? 1 : -1
    previousPageRef.current = currentPage
  }

  const direction = directionRef.current
  const showHeroLayout = isFirstPage && !searchQuery
  const enterTransition = respectReducedMotion(reduceMotion, layoutTransition)
  const exitTransition = respectReducedMotion(reduceMotion, fadeTransition)

  return (
    <>
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={currentPage}
          custom={direction}
          initial={skipEnterRef.current ? false : "enter"}
          animate="center"
          exit="exit"
          variants={{
            enter: (pageDirection: number) => ({
              x: reduceMotion ? 0 : pageDirection * PAGE_SLIDE_OFFSET,
              opacity: 0,
            }),
            center: {
              x: 0,
              opacity: 1,
              transition: enterTransition,
            },
            exit: (pageDirection: number) => ({
              x: reduceMotion ? 0 : pageDirection * -PAGE_SLIDE_OFFSET,
              opacity: 0,
              transition: exitTransition,
            }),
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-6"
        >
          {showHeroLayout ? (
            <div className="col-span-1 sm:col-span-1 lg:col-span-4 lg:row-span-2">
              <AddNotebookCard disabled={creating} onClick={onCreate} tall />
            </div>
          ) : null}
          {page.map((notebook, index) => (
            <div
              key={notebook._id}
              className={cn(
                "col-span-1",
                showHeroLayout && index === 0
                  ? "lg:col-span-8"
                  : "lg:col-span-4",
              )}
            >
              <NotebookCard
                notebookId={String(notebook._id)}
                title={notebook.title}
                lastUsedLabel={formatDistanceToNow(notebook.lastUsedAt, {
                  addSuffix: true,
                })}
                sourceCount={notebook.sourceCount}
                featured={showHeroLayout && index === 0}
                onRename={async (title) => {
                  await onRename(notebook._id as Id<"notebooks">, title)
                }}
                onDelete={async () => {
                  await onDelete(notebook._id as Id<"notebooks">)
                }}
              />
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {showPagination ? (
        <div className="mt-12 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            disabled={!canGoPrevious}
            onClick={onPrevious}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <p
            className="min-w-12 text-center text-sm tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            <span className="sr-only">
              Page {currentPage} of {pageCount}
            </span>
            <span aria-hidden>
              {currentPage}/{pageCount}
            </span>
          </p>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            disabled={!canGoNext}
            onClick={onNext}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      ) : null}
    </>
  )
}
