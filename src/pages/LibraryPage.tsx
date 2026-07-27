import { AppHeader } from "src/components/layout/AppHeader"
import { LibraryEmptyState } from "src/components/library/LibraryEmptyState"
import { LibraryNotebookGrid } from "src/components/library/LibraryNotebookGrid"
import { LibrarySearchField } from "src/components/library/LibrarySearchField"
import { Eyebrow } from "src/components/ui/Eyebrow"
import { IslandCta } from "src/components/ui/IslandCta"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { Reveal } from "src/components/ui/Reveal"
import { Button } from "src/components/ui/shadcn/button"
import { useLibraryPageData } from "src/pages/useLibraryPageData"

export function LibraryPage() {
  const library = useLibraryPageData()

  return (
    <div className="atmosphere atmosphere-noise relative min-h-dvh">
      <div className="relative z-10">
        <AppHeader
          email={library.session.data?.user.email}
          name={library.session.data?.user.name}
        />
        <main className="mx-auto w-full max-w-336 px-4 py-16 md:px-6 md:py-24">
          <Reveal className="mb-10 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <Eyebrow>Library</Eyebrow>
              <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
                Your notebooks
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
                Open a notebook to gather sources and ask questions grounded in
                them.
              </p>
            </div>
            <IslandCta
              disabled={library.creating}
              onClick={() => void library.onCreate()}
            >
              <PendingLabel
                pending={library.creating}
                pendingLabel="Creating notebook"
              >
                New notebook
              </PendingLabel>
            </IslandCta>
          </Reveal>

          {library.showSearch ? (
            <LibrarySearchField
              value={library.draft}
              onChange={library.setDraft}
              onClear={library.clearSearch}
            />
          ) : null}

          {library.isLoading ? (
            <span className="sr-only" role="status">
              Loading notebooks
            </span>
          ) : null}

          {library.isEmpty ? (
            <Reveal delay={0.05}>
              <LibraryEmptyState
                creating={library.creating}
                onCreate={() => void library.onCreate()}
              />
            </Reveal>
          ) : null}

          {library.noMatches ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No notebooks match “{library.searchTerm}”
              </p>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={library.clearSearch}
              >
                Clear search
              </Button>
            </div>
          ) : null}

          {!library.isLoading && !library.isEmpty && !library.noMatches ? (
            <LibraryNotebookGrid
              page={library.page}
              searchQuery={library.searchTerm}
              isFirstPage={library.currentPage <= 1}
              creating={library.creating}
              showPagination={library.showPagination}
              currentPage={library.currentPage}
              pageCount={library.pageCount}
              canGoPrevious={library.currentPage > 1}
              canGoNext={library.currentPage < library.pageCount}
              onCreate={() => void library.onCreate()}
              onPrevious={() => library.goToPage(library.currentPage - 1)}
              onNext={() => library.goToPage(library.currentPage + 1)}
              onRename={async (notebookId, title) => {
                await library.renameNotebook({ notebookId, title })
              }}
              onDelete={async (notebookId) => {
                await library.removeNotebook({ notebookId })
              }}
            />
          ) : null}
        </main>
      </div>
    </div>
  )
}
