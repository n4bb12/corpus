import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "src/components/ui/popover"

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
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="relative inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-primary/15 px-2 text-xs font-medium text-primary before:absolute before:-inset-2"
					aria-label={`Citation ${index}: ${title}`}
					onClick={() => {
						if (canNavigate) {
							onOpen()
						}
					}}
				>
					{index}
				</button>
			</PopoverTrigger>
			<PopoverContent className="max-w-sm rounded-xl text-sm">
				<p className="mb-2 font-medium">{title}</p>
				<p className="text-muted-foreground">{excerpt}</p>
				{!canNavigate ? (
					<p className="mt-2 text-xs text-muted-foreground">
						Source deleted. Excerpt retained.
					</p>
				) : null}
			</PopoverContent>
		</Popover>
	)
}
