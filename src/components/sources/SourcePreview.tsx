import { ArrowLeft } from "lucide-react"
import { marked } from "marked"
import { useEffect, useMemo, useRef } from "react"
import { Button } from "src/components/ui/button"
import { ScrollArea } from "src/components/ui/scroll-area"
import { Skeleton } from "src/components/ui/skeleton"
import {
	type CitationOffsetRange,
	resolveCitationOffsets,
} from "src/lib/citation_highlight"
import { formatTitle } from "src/lib/source_title"
import { cn } from "src/lib/utils"

export type SourcePreviewHighlight = {
	start?: number
	end?: number
	excerpt: string
}

export type SourcePreviewProps = {
	title: string
	markdown: string | null
	highlight?: SourcePreviewHighlight | null
	onBack: () => void
	onHighlightUnresolved?: (excerpt: string) => void
}

const SKELETON_LINES = [
	{ id: "line-1", width: "w-[92%]", spaced: false },
	{ id: "line-2", width: "w-[78%]", spaced: false },
	{ id: "line-3", width: "w-[88%]", spaced: false },
	{ id: "line-4", width: "w-[64%]", spaced: true },
	{ id: "line-5", width: "w-[95%]", spaced: false },
	{ id: "line-6", width: "w-[72%]", spaced: false },
	{ id: "line-7", width: "w-[84%]", spaced: false },
	{ id: "line-8", width: "w-[58%]", spaced: true },
	{ id: "line-9", width: "w-[90%]", spaced: false },
	{ id: "line-10", width: "w-[70%]", spaced: false },
	{ id: "line-11", width: "w-[86%]", spaced: false },
	{ id: "line-12", width: "w-[48%]", spaced: false },
] as const

function blocksWithOffsets(content: string) {
	const blocks: Array<{ text: string; start: number }> = []
	let offset = 0
	let blockStart = 0
	let blockLines: string[] = []

	for (const line of content.split("\n")) {
		if (line.trim()) {
			if (!blockLines.length) {
				blockStart = offset
			}

			blockLines.push(line)
		} else if (blockLines.length) {
			blocks.push({
				text: blockLines.join("\n"),
				start: blockStart,
			})
			blockLines = []
		}

		offset += line.length + 1
	}

	if (blockLines.length) {
		blocks.push({
			text: blockLines.join("\n"),
			start: blockStart,
		})
	}

	return blocks
}

function SourcePreviewSkeleton() {
	return (
		<div className="flex h-full flex-col gap-3" aria-busy="true">
			{SKELETON_LINES.map((line) => (
				<Skeleton
					key={line.id}
					className={cn("h-4 rounded-md", line.width, line.spaced && "mb-3")}
				/>
			))}
			<span className="sr-only" role="status">
				Loading preview
			</span>
		</div>
	)
}

function locatorFromHighlight(
	highlight?: SourcePreviewHighlight | null,
): CitationOffsetRange | null {
	if (
		!highlight ||
		typeof highlight.start !== "number" ||
		typeof highlight.end !== "number"
	) {
		return null
	}

	return { start: highlight.start, end: highlight.end }
}

function scrollTargetStart(
	paragraphs: Array<{ text: string; start: number }>,
	offsets: CitationOffsetRange,
) {
	const containing = paragraphs.find(({ text, start }) => {
		const end = start + text.length

		return start <= offsets.start && end > offsets.start
	})

	if (containing) {
		return containing.start
	}

	const overlapping = paragraphs.find(({ text, start }) => {
		const end = start + text.length

		return start < offsets.end && end > offsets.start
	})

	return overlapping?.start
}

export function SourcePreview({
	title,
	markdown,
	highlight,
	onBack,
	onHighlightUnresolved,
}: SourcePreviewProps) {
	const blocks = useMemo(
		() => (markdown ? blocksWithOffsets(markdown) : []),
		[markdown],
	)
	const highlightRef = useRef<HTMLDivElement | null>(null)
	const unresolvedKey = useRef<string | null>(null)
	const resolvedOffsets = useMemo(() => {
		if (!markdown || !highlight) {
			return null
		}

		return resolveCitationOffsets(
			markdown,
			locatorFromHighlight(highlight),
			highlight.excerpt,
		)
	}, [highlight, markdown])
	const targetStart =
		resolvedOffsets && blocks.length
			? scrollTargetStart(blocks, resolvedOffsets)
			: undefined

	useEffect(() => {
		if (!markdown || !highlight) {
			return
		}

		if (resolvedOffsets) {
			unresolvedKey.current = null
			const frame = window.requestAnimationFrame(() => {
				highlightRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "center",
				})
			})

			return () => window.cancelAnimationFrame(frame)
		}

		const key = `${highlight.excerpt}:${markdown.length}`

		if (unresolvedKey.current === key) {
			return
		}

		unresolvedKey.current = key
		onHighlightUnresolved?.(highlight.excerpt)
	}, [highlight, markdown, onHighlightUnresolved, resolvedOffsets])

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<div className="z-10 flex shrink-0 items-center gap-2 border-b border-border bg-background/95 px-8 py-3 backdrop-blur">
				<Button
					variant="ghost"
					size="sm"
					className="rounded-sm"
					onClick={onBack}
				>
					<ArrowLeft size={16} className="mr-1" />
					Back
				</Button>
				<div className="min-w-0 flex-1 truncate font-medium">
					{formatTitle(title)}
				</div>
			</div>
			<ScrollArea className="min-h-0 flex-1 overflow-hidden">
				<div className="p-4 sm:p-6">
					{markdown ? (
						<article className="prose prose-sm dark:prose-invert max-w-none space-y-4">
							{blocks.map(({ text, start }) => {
								const end = start + text.length
								const highlighted =
									!!resolvedOffsets &&
									start < resolvedOffsets.end &&
									end > resolvedOffsets.start
								const html = marked.parse(text, { async: false }) as string

								return (
									<div
										key={start}
										ref={start === targetStart ? highlightRef : undefined}
										className={cn(
											"[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
											highlighted && "citation-highlight",
										)}
										dangerouslySetInnerHTML={{ __html: html }}
									/>
								)
							})}
						</article>
					) : (
						<SourcePreviewSkeleton />
					)}
				</div>
			</ScrollArea>
		</div>
	)
}
