import { Plus } from "lucide-react"
import { AppHeader } from "src/components/layout/AppHeader"
import { LibraryEmptyState } from "src/components/library/LibraryEmptyState"
import { LibraryNotebookGrid } from "src/components/library/LibraryNotebookGrid"
import { LibrarySearchField } from "src/components/library/LibrarySearchField"
import { Button } from "src/components/ui/button"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { useLibraryPage } from "src/pages/useLibraryPage"

export function LibraryPage() {
	const library = useLibraryPage()

	return (
		<div className="atmosphere atmosphere-noise relative min-h-dvh">
			<div className="relative z-10">
				<AppHeader
					email={library.session.data?.user.email}
					name={library.session.data?.user.name}
				/>
				<main className="mx-auto w-full max-w-[84rem] px-4 py-8 md:px-6">
					<div className="mb-4 flex items-center justify-between gap-4">
						<h1 className="text-2xl font-semibold tracking-tight">
							Your notebooks
						</h1>
						<Button
							className="rounded-sm"
							disabled={library.creating}
							onClick={() => void library.onCreate()}
						>
							<PendingLabel
								pending={library.creating}
								pendingLabel="Creating notebook"
							>
								<span className="inline-flex items-center">
									<Plus size={16} className="mr-1.5" />
									New notebook
								</span>
							</PendingLabel>
						</Button>
					</div>

					<LibrarySearchField
						value={library.draft}
						onChange={library.setDraft}
						onClear={library.clearSearch}
					/>

					{library.isEmpty ? (
						<LibraryEmptyState
							creating={library.creating}
							onCreate={() => void library.onCreate()}
						/>
					) : null}

					{library.noMatches ? (
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								No notebooks match “{library.search.q}”
							</p>
							<Button
								variant="outline"
								className="rounded-sm"
								onClick={library.clearSearch}
							>
								Clear search
							</Button>
						</div>
					) : null}

					{!library.isEmpty && !library.noMatches ? (
						<LibraryNotebookGrid
							page={library.page}
							isLoading={library.isLoading}
							searchQuery={library.search.q}
							creating={library.creating}
							showPagination={library.showPagination}
							canGoPrevious={!!library.search.cursor}
							canGoNext={!library.isLoading && !library.result?.isDone}
							onCreate={() => void library.onCreate()}
							onPrevious={() =>
								void library.navigate({
									to: "/",
									search: { q: library.search.q, cursor: undefined },
								})
							}
							onNext={() =>
								void library.navigate({
									to: "/",
									search: {
										q: library.search.q,
										cursor: library.result?.continueCursor ?? undefined,
									},
								})
							}
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
