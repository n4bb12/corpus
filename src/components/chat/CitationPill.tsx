import { useRef, useState } from "react"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "src/components/ui/popover"
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
	const [open, setOpen] = useState(false)
	const closeTimer = useRef<number | null>(null)

	function clearCloseTimer() {
		if (closeTimer.current !== null) {
			window.clearTimeout(closeTimer.current)
			closeTimer.current = null
		}
	}

	function openPopover() {
		clearCloseTimer()
		setOpen(true)
	}

	function scheduleClose() {
		clearCloseTimer()
		closeTimer.current = window.setTimeout(() => {
			setOpen(false)
			closeTimer.current = null
		}, 120)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="relative inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-primary/15 px-2 text-xs font-medium text-primary before:absolute before:-inset-2"
					aria-label={`Citation ${index}: ${displayTitle}`}
					onMouseEnter={openPopover}
					onMouseLeave={scheduleClose}
					onFocus={openPopover}
					onBlur={scheduleClose}
					onClick={() => {
						clearCloseTimer()
						setOpen(false)

						if (canNavigate) {
							onOpen()
						}
					}}
				>
					{index}
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="max-w-sm rounded-xl text-sm"
				onMouseEnter={openPopover}
				onMouseLeave={scheduleClose}
				onOpenAutoFocus={(event) => event.preventDefault()}
			>
				<p className="mb-2 font-medium">{displayTitle}</p>
				<p className="text-muted-foreground">{plainExcerpt}</p>
				{!canNavigate ? (
					<p className="mt-2 text-xs text-muted-foreground">
						Source deleted. Excerpt retained.
					</p>
				) : null}
			</PopoverContent>
		</Popover>
	)
}
