import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "src/components/ui/tooltip"
import { markdownToPlainText } from "src/lib/markdown_plain"
import { formatTitle } from "src/lib/source_title"

export type CitationPillProps = {
	index: number
	title: string
	excerpt: string
	canNavigate: boolean
	onOpen: () => void
}

export function CitationPill({
	index,
	title,
	excerpt,
	canNavigate,
	onOpen,
}: CitationPillProps) {
	const displayTitle = formatTitle(title)
	const plainExcerpt = markdownToPlainText(excerpt)

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					className="relative inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-primary/15 px-2 text-xs font-medium text-primary before:absolute before:-inset-2"
					aria-label={`Citation ${index}: ${displayTitle}`}
					onClick={() => {
						if (canNavigate) {
							onOpen()
						}
					}}
				>
					{index}
				</button>
			</TooltipTrigger>
			<TooltipContent
				side="top"
				sideOffset={8}
				className="max-w-sm flex-col items-start gap-1.5 rounded-xl bg-popover px-3 py-2.5 text-left text-sm text-popover-foreground shadow-2xl ring-1 ring-foreground/5 [&_svg]:hidden"
			>
				<p className="font-medium">{displayTitle}</p>
				<p className="text-muted-foreground">{plainExcerpt}</p>
				{!canNavigate ? (
					<p className="text-xs text-muted-foreground">
						Source deleted. Excerpt retained.
					</p>
				) : null}
			</TooltipContent>
		</Tooltip>
	)
}
