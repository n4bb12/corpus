import { useRef } from "react"
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
	open: boolean
	onOpenChange: (open: boolean) => void
	onOpen: () => void
}

export function CitationPill({
	index,
	title,
	excerpt,
	canNavigate,
	open,
	onOpenChange,
	onOpen,
}: CitationPillProps) {
	const displayTitle = formatTitle(title)
	const plainExcerpt = markdownToPlainText(excerpt)
	const closeTimer = useRef<number | null>(null)

	function clearCloseTimer() {
		if (closeTimer.current !== null) {
			window.clearTimeout(closeTimer.current)
			closeTimer.current = null
		}
	}

	function openPopover() {
		clearCloseTimer()
		onOpenChange(true)
	}

	function scheduleClose() {
		clearCloseTimer()
		closeTimer.current = window.setTimeout(() => {
			onOpenChange(false)
			closeTimer.current = null
		}, 80)
	}

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				clearCloseTimer()
				onOpenChange(nextOpen)
			}}
		>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="relative mt-1 inline-flex size-7 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary before:absolute before:-inset-2"
					aria-label={`Citation ${index}: ${displayTitle}`}
					onMouseEnter={openPopover}
					onMouseLeave={scheduleClose}
					onFocus={openPopover}
					onBlur={scheduleClose}
					onClick={() => {
						clearCloseTimer()
						onOpenChange(false)

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
