import { Popover, PopoverContent } from "src/components/ui/popover"
import { markdownToPlainText } from "src/lib/markdown_plain"

export type CitationExcerptPopoverProps = {
	excerpt: string | null
	onOpenChange: (open: boolean) => void
}

export function CitationExcerptPopover({
	excerpt,
	onOpenChange,
}: CitationExcerptPopoverProps) {
	return (
		<Popover open={!!excerpt} onOpenChange={onOpenChange}>
			<PopoverContent className="fixed right-4 bottom-4 z-50 max-w-sm rounded-xl">
				<p className="text-sm text-muted-foreground">
					{excerpt ? markdownToPlainText(excerpt) : null}
				</p>
			</PopoverContent>
		</Popover>
	)
}
