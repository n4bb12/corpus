import { Checkbox } from "src/components/ui/checkbox"
import type { Id } from "src/convex/_generated/dataModel"

export type SourcesSelectAllProps = {
	notebookId: Id<"notebooks">
	sourceIds: Id<"sources">[]
	selectedCount: number
	allSelected: boolean
	someSelected: boolean
	onSelectMany: (args: {
		notebookId: Id<"notebooks">
		sourceIds: Id<"sources">[]
		selected: boolean
	}) => void
}

export function SourcesSelectAll({
	notebookId,
	sourceIds,
	selectedCount,
	allSelected,
	someSelected,
	onSelectMany,
}: SourcesSelectAllProps) {
	if (!sourceIds.length) {
		return null
	}

	return (
		<div className="flex items-center justify-end gap-2 px-2 py-1.5 text-sm">
			<label
				htmlFor="select-all-sources"
				className="cursor-pointer tabular-nums text-muted-foreground"
			>
				{selectedCount}/{sourceIds.length} selected
			</label>
			<div className="flex items-center gap-1">
				<span className="size-6 shrink-0" aria-hidden />
				<Checkbox
					id="select-all-sources"
					checked={allSelected ? true : someSelected ? "indeterminate" : false}
					onCheckedChange={(checked) =>
						onSelectMany({
							notebookId,
							sourceIds,
							selected: checked === true,
						})
					}
				/>
			</div>
		</div>
	)
}
