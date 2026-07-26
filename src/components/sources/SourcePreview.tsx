import { ArrowLeft } from "lucide-react"
import { useEffect, useRef } from "react"
import { Button } from "src/components/ui/button"
import { ScrollArea } from "src/components/ui/scroll-area"
import { Skeleton } from "src/components/ui/skeleton"
import { formatTitle } from "src/lib/source_title"
import { cn } from "src/lib/utils"

export type SourcePreviewProps = {
	title: string
	markdown: string | null
	highlightOffsets?: { start: number; end: number } | null
	onBack: () => void
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

function paragraphsWithOffsets(content: string) {
	const paragraphs: Array<{ text: string; start: number }> = []
	let offset = 0

	for (const line of content.split("\n")) {
		if (line.trim()) {
			paragraphs.push({ text: line, start: offset })
		}

		offset += line.length + 1
	}

	return paragraphs
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

export function SourcePreview({
	title,
	markdown,
	highlightOffsets,
	onBack,
}: SourcePreviewProps) {
	const paragraphs = markdown ? paragraphsWithOffsets(markdown) : []
	const highlightRef = useRef<HTMLParagraphElement | null>(null)

	useEffect(() => {
		if (!highlightOffsets || !markdown) {
			return
		}

		const frame = window.requestAnimationFrame(() => {
			highlightRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "center",
			})
		})

		return () => window.cancelAnimationFrame(frame)
	}, [highlightOffsets, markdown])

	return (
		<div className="flex h-full flex-col">
			<div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
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
			<ScrollArea className="min-h-0 flex-1 px-4 py-4">
				{markdown ? (
					<article className="prose prose-sm dark:prose-invert max-w-none space-y-3">
						{paragraphs.map(({ text, start }) => {
							const end = start + text.length
							const highlighted =
								!!highlightOffsets &&
								start < highlightOffsets.end &&
								end > highlightOffsets.start
							const isScrollTarget =
								highlighted &&
								!!highlightOffsets &&
								start <= highlightOffsets.start &&
								end > highlightOffsets.start

							return (
								<p
									key={start}
									ref={isScrollTarget ? highlightRef : undefined}
									className={cn("my-0", highlighted && "citation-highlight")}
								>
									{text}
								</p>
							)
						})}
					</article>
				) : (
					<SourcePreviewSkeleton />
				)}
			</ScrollArea>
		</div>
	)
}
