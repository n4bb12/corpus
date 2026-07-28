import { AppHeader } from "src/components/layout/AppHeader"
import { LibraryNotebookGrid } from "src/components/library/LibraryNotebookGrid"
import { LibrarySearchField } from "src/components/library/LibrarySearchField"
import { Eyebrow } from "src/components/ui/Eyebrow"
import { IslandCta } from "src/components/ui/IslandCta"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { Reveal } from "src/components/ui/Reveal"
import { Button } from "src/components/ui/shadcn/button"
import { ScrollArea } from "src/components/ui/shadcn/scroll-area"
import { useLibraryPageData } from "src/pages/useLibraryPageData"

export function LibraryPage() {
  const library = useLibraryPageData()

  return (
    <div
      className="atmosphere atmosphere-noise relative flex h-dvh flex-col overflow-hidden"
      aria-busy={library.isLoading || undefined}
    >
      {library.isLoading ? (
        <span className="sr-only" role="status">
          Loading notebooks
        </span>
      ) : null}

      <ScrollArea className="min-h-0 flex-1">
        <div className="relative z-10">
          <AppHeader
            email={library.session.data?.user.email}
            name={library.session.data?.user.name}
          />
          <main className="mx-auto w-full max-w-336 px-4 py-16 md:px-6">
            <div className="mb-10 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <Eyebrow>Library</Eyebrow>
                <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
                  Your notebooks
                </h1>
                <p className="max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
                  Open a notebook to gather sources and ask questions grounded
                  in them.
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
            </div>

            {!library.isLoading ? (
              <Reveal>
                {library.showSearch ? (
                  <LibrarySearchField
                    value={library.draft}
                    onChange={library.setDraft}
                    onClear={library.clearSearch}
                  />
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
                ) : (
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
                      if (!title.trim()) {
                        const response = await fetch(
                          "/api/notebooks/clear-title",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ notebookId }),
                          },
                        )

                        if (!response.ok) {
                          const payload = (await response
                            .json()
                            .catch(() => null)) as { error?: string } | null
                          throw new Error(
                            payload?.error ||
                              "Couldn't clear the notebook title.",
                          )
                        }

                        return
                      }

                      await library.renameNotebook({ notebookId, title })
                    }}
                    onDelete={async (notebookId) => {
                      await library.removeNotebook({ notebookId })
                    }}
                  />
                )}
              </Reveal>
            ) : null}
          </main>
        </div>
      </ScrollArea>
    </div>
  )
}
