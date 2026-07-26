import { ArrowLeft } from "lucide-react"
import { marked } from "marked"
import { useEffect, useMemo, useRef } from "react"
import { Button } from "src/components/ui/button"
import { ScrollArea } from "src/components/ui/scroll-area"
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

const PREVIEW_PLACEHOLDER_BLOCKS = [
	"Loading the first passage of this source while the text is prepared for reading.",
	"A second block keeps the preview layout stable until the real markdown arrives.",
	"Shorter line.",
	"Another paragraph approximates typical source density without inventing a separate skeleton layout.",
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
			<div className="z-10 flex shrink-0 items-center gap-2 border-b border-border bg-background/95 p-4 backdrop-blur">
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
						<>
							<span className="sr-only" role="status">
								Loading source
							</span>
							<article
								className="prose prose-sm dark:prose-invert max-w-none space-y-4"
								aria-busy="true"
								aria-hidden
							>
								{PREVIEW_PLACEHOLDER_BLOCKS.map((text) => (
									<p key={text} className="placeholder-shimmer">
										{text}
									</p>
								))}
							</article>
						</>
					)}
				</div>
			</ScrollArea>
		</div>
	)
}
