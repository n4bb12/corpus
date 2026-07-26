import { ArrowLeft } from "lucide-react"
import { useEffect, useRef } from "react"
import { Button } from "src/components/ui/button"
import { ScrollArea } from "src/components/ui/scroll-area"
import { formatTitle } from "src/lib/source_title"
import { cn } from "src/lib/utils"

export type SourcePreviewProps = {
	title: string
	markdown: string | null
	highlightOffsets?: { start: number; end: number } | null
	onBack: () => void
}

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

export function SourcePreview({
	title,
	markdown,
	highlightOffsets,
	onBack,
}: SourcePreviewProps) {
	const content = markdown ?? "Loading preview…"
	const paragraphs = paragraphsWithOffsets(content)
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
			</ScrollArea>
		</div>
	)
}
