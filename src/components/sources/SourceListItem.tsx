import {
	FileText,
	Link as LinkIcon,
	LoaderCircle,
	MoreHorizontal,
	Type,
} from "lucide-react"
import { Button } from "src/components/ui/button"
import { Checkbox } from "src/components/ui/checkbox"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu"
import { Label } from "src/components/ui/label"
import type { Doc } from "src/convex/_generated/dataModel"
import { formatTitle } from "src/lib/source_title"

const STATUS_LABEL: Record<string, string> = {
	pending: "Queued",
	extracting: "Extracting",
	chunking: "Chunking",
	embedding: "Embedding",
	ready: "Ready",
	failed: "Failed",
}

export type SourceListItemProps = {
	source: Doc<"sources">
	onPreview: () => void
	onRename: () => void
	onRetry: () => void
	onDelete: () => void
	onSelect: (selected: boolean) => void
}

export function SourceListItem({
	source,
	onPreview,
	onRename,
	onRetry,
	onDelete,
	onSelect,
}: SourceListItemProps) {
	const Icon =
		source.kind === "url" ? LinkIcon : source.kind === "file" ? FileText : Type
	const busy =
		source.processingState !== "ready" && source.processingState !== "failed"
	const checkboxId = `source-select-${source._id}`
	const label = formatTitle(source.title)

	return (
		<div className="group relative flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-muted/60">
			<button
				type="button"
				className="absolute inset-0 z-0 rounded-xl"
				aria-label={`Open ${label}`}
				onClick={onPreview}
			/>
			<span className="pointer-events-none relative z-10 mt-0.5 text-primary">
				{busy ? (
					<LoaderCircle size={18} className="animate-spin" />
				) : (
					<Icon size={18} />
				)}
			</span>
			<span className="pointer-events-none relative z-10 min-w-0 flex-1">
				<span className="line-clamp-2 text-sm font-medium">{label}</span>
				<span className="mt-0.5 block text-xs text-muted-foreground">
					{source.processingState === "failed"
						? source.errorCode || "Failed"
						: STATUS_LABEL[source.processingState]}
				</span>
			</span>
			<div className="relative z-10 flex items-center gap-1">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon-xs"
							className="rounded-sm opacity-100 touch-manipulation md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
							aria-label={`Source menu for ${label}`}
						>
							<MoreHorizontal size={16} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="rounded-xl">
						<DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
						{source.processingState === "failed" ? (
							<DropdownMenuItem onClick={onRetry}>Retry</DropdownMenuItem>
						) : null}
						<DropdownMenuItem variant="destructive" onClick={onDelete}>
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<Label
					htmlFor={checkboxId}
					className="flex cursor-pointer items-center gap-2"
				>
					<span className="sr-only">Select {label}</span>
					<Checkbox
						id={checkboxId}
						checked={source.selected}
						disabled={source.processingState === "failed"}
						onCheckedChange={(checked) => onSelect(checked === true)}
					/>
				</Label>
			</div>
		</div>
	)
}
