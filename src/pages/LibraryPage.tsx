import { AppHeader } from "src/components/layout/AppHeader"
import { LibraryEmptyState } from "src/components/library/LibraryEmptyState"
import { LibraryNotebookGrid } from "src/components/library/LibraryNotebookGrid"
import { LibrarySearchField } from "src/components/library/LibrarySearchField"
import { Button } from "src/components/ui/shadcn/button"
import { Eyebrow } from "src/components/ui/Eyebrow"
import { IslandCta } from "src/components/ui/IslandCta"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { Reveal } from "src/components/ui/Reveal"
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
				<main className="mx-auto w-full max-w-[84rem] px-4 py-16 md:px-6 md:py-24">
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
						<Reveal delay={0.03}>
							<LibrarySearchField
								value={library.draft}
								onChange={library.setDraft}
								onClear={library.clearSearch}
							/>
						</Reveal>
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
						<Reveal delay={0.05} className="space-y-4">
							<p className="text-sm text-muted-foreground">
								No notebooks match “{library.search.q}”
							</p>
							<Button
								variant="outline"
								className="rounded-full"
								onClick={library.clearSearch}
							>
								Clear search
							</Button>
						</Reveal>
					) : null}

					{!library.isLoading && !library.isEmpty && !library.noMatches ? (
						<Reveal delay={0.05}>
							<LibraryNotebookGrid
								page={library.page}
								searchQuery={library.search.q}
								creating={library.creating}
								showPagination={library.showPagination}
								canGoPrevious={!!library.search.cursor}
								canGoNext={!library.result?.isDone}
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
						</Reveal>
					) : null}
				</main>
			</div>
		</div>
	)
}
