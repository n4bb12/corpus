import { formatDistanceToNow } from "date-fns"
import { AddNotebookCard } from "src/components/library/AddNotebookCard"
import { NotebookCard } from "src/components/library/NotebookCard"
import { Button } from "src/components/ui/button"
import type { Id } from "src/convex/_generated/dataModel"

export type LibraryNotebook = {
	_id: string
	title: string
	lastUsedAt: number
	sourceCount: number
}

export type LibraryNotebookGridProps = {
	page: LibraryNotebook[]
	isLoading: boolean
	searchQuery?: string
	creating: boolean
	showPagination: boolean
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
	isLoading,
	searchQuery,
	creating,
	showPagination,
	canGoPrevious,
	canGoNext,
	onCreate,
	onPrevious,
	onNext,
	onRename,
	onDelete,
}: LibraryNotebookGridProps) {
	return (
		<>
			<div
				className="grid gap-4 max-sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
				aria-busy={isLoading}
			>
				{isLoading ? (
					<span className="sr-only" role="status">
						Loading notebooks
					</span>
				) : !searchQuery ? (
					<AddNotebookCard disabled={creating} onClick={onCreate} />
				) : null}
				{page.map((notebook) => (
					<NotebookCard
						key={notebook._id}
						notebookId={String(notebook._id)}
						title={notebook.title}
						lastUsedLabel={formatDistanceToNow(notebook.lastUsedAt, {
							addSuffix: true,
						})}
						sourceCount={notebook.sourceCount}
						loading={isLoading}
						onRename={async (title) => {
							await onRename(notebook._id as Id<"notebooks">, title)
						}}
						onDelete={async () => {
							await onDelete(notebook._id as Id<"notebooks">)
						}}
					/>
				))}
			</div>

			{showPagination ? (
				<div className="mt-8 flex items-center justify-center gap-3">
					<Button
						variant="outline"
						className="rounded-sm"
						disabled={!canGoPrevious}
						onClick={onPrevious}
					>
						Previous
					</Button>
					<Button
						variant="outline"
						className="rounded-sm"
						disabled={!canGoNext}
						onClick={onNext}
					>
						Next
					</Button>
				</div>
			) : null}
		</>
	)
}
