import {
	FileText,
	Link as LinkIcon,
	LoaderCircle,
	MoreHorizontal,
	Type,
} from "lucide-react"
import { motion } from "motion/react"
import { Button } from "src/components/ui/button"
import { Checkbox } from "src/components/ui/checkbox"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu"
import type { Doc } from "src/convex/_generated/dataModel"
import { layoutTransition } from "src/lib/motion"

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

	return (
		<motion.div
			layout
			transition={layoutTransition}
			className="group mb-1 flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-muted/60"
		>
			<button
				type="button"
				className="flex min-w-0 flex-1 items-start gap-2 text-left"
				onClick={onPreview}
			>
				<span className="mt-0.5 text-primary">
					{busy ? (
						<LoaderCircle size={18} className="animate-spin" />
					) : (
						<Icon size={18} />
					)}
				</span>
				<span className="min-w-0">
					<span className="line-clamp-2 text-sm font-medium">{source.title}</span>
					<span className="mt-0.5 block text-xs text-muted-foreground">
						{source.processingState === "failed"
							? source.errorCode || "Failed"
							: STATUS_LABEL[source.processingState]}
					</span>
				</span>
			</button>
			<div className="flex items-center gap-1">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon-xs"
							className="rounded-sm opacity-100 touch-manipulation md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
							aria-label={`Source menu for ${source.title}`}
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
				<Checkbox
					checked={source.selected}
					disabled={source.processingState === "failed"}
					onCheckedChange={(checked) => onSelect(checked === true)}
					aria-label={`Select ${source.title}`}
				/>
			</div>
		</motion.div>
	)
}
