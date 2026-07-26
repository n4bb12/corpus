import { useRef, useState } from "react"
import { CitationPill } from "src/components/chat/CitationPill"
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "src/components/ui/popover"
import { markdownToPlainText } from "src/lib/markdown_plain"
import { formatTitle } from "src/lib/source_title"

export type ChatCiteArgs = {
	sourceId?: string
	startOffset?: number
	endOffset?: number
	excerpt: string
	canNavigate: boolean
}

type ChatCitation = {
	_id: string
	liveTitle: string
	excerpt: string
	canNavigate: boolean
	sourceId?: string
	locator?: { startOffset?: number; endOffset?: number } | null
}

type HoverState = {
	index: number
	rect: DOMRect
}

export type CitationPillsProps = {
	citations: ChatCitation[]
	indexes: number[]
	onCite: (args: ChatCiteArgs) => void
}

export function CitationPills({
	citations,
	indexes,
	onCite,
}: CitationPillsProps) {
	const uniqueIndexes = [...new Set(indexes)]
	const [hover, setHover] = useState<HoverState | null>(null)
	const closeTimer = useRef<number | null>(null)
	const activeCitation = hover ? citations[hover.index - 1] : null
	const displayTitle = activeCitation
		? formatTitle(activeCitation.liveTitle)
		: ""
	const plainExcerpt = activeCitation
		? markdownToPlainText(activeCitation.excerpt)
		: ""

	function clearCloseTimer() {
		if (closeTimer.current !== null) {
			window.clearTimeout(closeTimer.current)
			closeTimer.current = null
		}
	}

	function showCitation(index: number, element: HTMLButtonElement) {
		clearCloseTimer()
		setHover({
			index,
			rect: element.getBoundingClientRect(),
		})
	}

	function scheduleClose() {
		clearCloseTimer()
		closeTimer.current = window.setTimeout(() => {
			setHover(null)
			closeTimer.current = null
		}, 100)
	}

	function closeNow() {
		clearCloseTimer()
		setHover(null)
	}

	return (
		<div className="flex flex-wrap gap-2">
			{uniqueIndexes.map((index) => {
				const citation = citations[index - 1]

				if (!citation) {
					return null
				}

				return (
					<CitationPill
						key={`${citation._id}-${index}`}
						index={index}
						title={formatTitle(citation.liveTitle)}
						canNavigate={citation.canNavigate}
						onHover={(element) => showCitation(index, element)}
						onLeave={scheduleClose}
						onOpen={() => {
							closeNow()
							onCite({
								sourceId: citation.sourceId,
								startOffset: citation.locator?.startOffset,
								endOffset: citation.locator?.endOffset,
								excerpt: citation.excerpt,
								canNavigate: citation.canNavigate,
							})
						}}
					/>
				)
			})}

			<Popover
				open={!!hover && !!activeCitation}
				onOpenChange={(open) => {
					if (!open) {
						closeNow()
					}
				}}
			>
				{hover ? (
					<PopoverAnchor asChild>
						<span
							aria-hidden
							className="pointer-events-none fixed"
							style={{
								top: hover.rect.top,
								left: hover.rect.left,
								width: hover.rect.width,
								height: hover.rect.height,
							}}
						/>
					</PopoverAnchor>
				) : null}
				<PopoverContent
					side="top"
					sideOffset={8}
					className="w-auto max-w-sm gap-1.5 rounded-xl p-3"
					onMouseEnter={clearCloseTimer}
					onMouseLeave={scheduleClose}
					onOpenAutoFocus={(event) => event.preventDefault()}
					onCloseAutoFocus={(event) => event.preventDefault()}
				>
					{activeCitation ? (
						<>
							<p className="font-medium">{displayTitle}</p>
							<p className="text-muted-foreground">{plainExcerpt}</p>
							{!activeCitation.canNavigate ? (
								<p className="text-xs text-muted-foreground">
									Source deleted. Excerpt retained.
								</p>
							) : null}
						</>
					) : null}
				</PopoverContent>
			</Popover>
		</div>
	)
}
