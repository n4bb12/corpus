import { Checkbox } from "src/components/ui/shadcn/checkbox"
import type { Id } from "src/convex/_generated/dataModel"

export type SourcesSelectAllProps = {
	notebookId: Id<"notebooks">
	sourceIds: Id<"sources">[]
	selectedCount: number
	pendingCount?: number
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
	pendingCount = 0,
	onSelectMany,
}: SourcesSelectAllProps) {
	const totalCount = sourceIds.length + pendingCount

	if (!totalCount) {
		return null
	}

	// Uploads become selected sources, so count them as selected already.
	const displaySelected = selectedCount + pendingCount
	const allSelected = displaySelected === totalCount
	const someSelected = displaySelected > 0 && !allSelected

	return (
		<div className="flex items-center justify-end gap-2 px-2 py-1.5 text-sm">
			<label
				htmlFor="select-all-sources"
				className="cursor-pointer tabular-nums text-muted-foreground"
			>
				{displaySelected}/{totalCount} selected
			</label>
			<div className="flex items-center gap-1">
				<span className="size-6 shrink-0" aria-hidden />
				<Checkbox
					id="select-all-sources"
					checked={allSelected ? true : someSelected ? "indeterminate" : false}
					onCheckedChange={(checked) => {
						if (!sourceIds.length) {
							return
						}

						onSelectMany({
							notebookId,
							sourceIds,
							selected: checked === true,
						})
					}}
				/>
			</div>
		</div>
	)
}
