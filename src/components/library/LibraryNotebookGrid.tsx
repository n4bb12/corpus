import { formatDistanceToNow } from "date-fns"
import { AddNotebookCard } from "src/components/library/AddNotebookCard"
import { NotebookCard } from "src/components/library/NotebookCard"
import { Button } from "src/components/ui/button"
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
				className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12 lg:gap-6"
				aria-busy={isLoading}
			>
				{isLoading ? (
					<span className="sr-only" role="status">
						Loading notebooks
					</span>
				) : !searchQuery ? (
					<div className="col-span-1 sm:col-span-1 lg:col-span-4 lg:row-span-2">
						<AddNotebookCard disabled={creating} onClick={onCreate} tall />
					</div>
				) : null}
				{page.map((notebook, index) => (
					<div
						key={notebook._id}
						className={cn(
							"col-span-1",
							!searchQuery && index === 0 ? "lg:col-span-8" : "lg:col-span-4",
						)}
					>
						<NotebookCard
							notebookId={String(notebook._id)}
							title={notebook.title}
							lastUsedLabel={formatDistanceToNow(notebook.lastUsedAt, {
								addSuffix: true,
							})}
							sourceCount={notebook.sourceCount}
							loading={isLoading}
							featured={!searchQuery && index === 0}
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
						className="rounded-full"
						disabled={!canGoPrevious}
						onClick={onPrevious}
					>
						Previous
					</Button>
					<Button
						variant="outline"
						className="rounded-full"
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
