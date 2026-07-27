import { formatDistanceToNow } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AddNotebookCard } from "src/components/library/AddNotebookCard"
import { NotebookCard } from "src/components/library/NotebookCard"
import { Button } from "src/components/ui/shadcn/button"
import type { Id } from "src/convex/_generated/dataModel"
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
  const showHeroLayout = isFirstPage && !searchQuery

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-6">
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
              showHeroLayout && index === 0 ? "lg:col-span-8" : "lg:col-span-4",
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
      </div>

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
