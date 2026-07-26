import type { RefObject } from "react"
import { useMemo } from "react"
import { AddSourceCard } from "src/components/sources/AddSourceCard"
import { SourceListItem } from "src/components/sources/SourceListItem"
import { SourcesSelectAll } from "src/components/sources/SourcesSelectAll"
import { ScrollArea } from "src/components/ui/scroll-area"
import type { Doc, Id } from "src/convex/_generated/dataModel"

export type SourcesListProps = {
	notebookId: Id<"notebooks">
	listRef: RefObject<HTMLDivElement | null>
	filtered: Doc<"sources">[]
	selectable: Doc<"sources">[]
	selectedCount: number
	allSelected: boolean
	someSelected: boolean
	onAdd: () => void
	onSelectMany: (args: {
		notebookId: Id<"notebooks">
		sourceIds: Id<"sources">[]
		selected: boolean
	}) => void
	onPreview: (sourceId: Id<"sources">) => void
	onRename: (source: Doc<"sources">) => void
	onRetry: (sourceId: Id<"sources">) => void
	onDelete: (sourceId: Id<"sources">) => void
	onSelect: (sourceId: Id<"sources">, selected: boolean) => void
}

export function SourcesList({
	notebookId,
	listRef,
	filtered,
	selectable,
	selectedCount,
	allSelected,
	someSelected,
	onAdd,
	onSelectMany,
	onPreview,
	onRename,
	onRetry,
	onDelete,
	onSelect,
}: SourcesListProps) {
	const selectableIds = useMemo(
		() => selectable.map((source) => source._id),
		[selectable],
	)

	return (
		<ScrollArea
			viewportRef={listRef}
			className="relative mt-3 min-h-0 flex-1 px-4 pb-4"
		>
			<div className="flex flex-col gap-1">
				<AddSourceCard onClick={onAdd} />
				<SourcesSelectAll
					notebookId={notebookId}
					sourceIds={selectableIds}
					selectedCount={selectedCount}
					allSelected={allSelected}
					someSelected={someSelected}
					onSelectMany={onSelectMany}
				/>
				{filtered.map((source) => (
					<SourceListItem
						key={source._id}
						source={source}
						onPreview={onPreview}
						onRename={onRename}
						onRetry={onRetry}
						onDelete={onDelete}
						onSelect={onSelect}
					/>
				))}
			</div>
		</ScrollArea>
	)
}
