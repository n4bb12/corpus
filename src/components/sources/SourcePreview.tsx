import { ArrowLeft } from "lucide-react"
import { Button } from "src/components/ui/button"
import { cn } from "src/lib/utils"

export type SourcePreviewProps = {
	title: string
	markdown: string | null
	highlightOffsets?: { start: number; end: number } | null
	onBack: () => void
}

export function SourcePreview({
	title,
	markdown,
	highlightOffsets,
	onBack,
}: SourcePreviewProps) {
	const content = markdown ?? "Loading preview…"

	return (
		<div className="flex h-full flex-col">
			<div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
				<Button variant="ghost" size="sm" className="rounded-sm" onClick={onBack}>
					<ArrowLeft size={16} className="mr-1" />
					Back
				</Button>
				<div className="min-w-0 flex-1 truncate font-medium">{title}</div>
			</div>
			<div className="flex-1 overflow-auto px-4 py-4">
				<article className="prose prose-sm dark:prose-invert max-w-none">
					{content.split("\n").map((line, index) => {
						const start = content.split("\n").slice(0, index).join("\n").length
						const end = start + line.length
						const highlighted =
							highlightOffsets &&
							start <= highlightOffsets.start &&
							end >= highlightOffsets.start

						return (
							<p
								key={`${index}-${line.slice(0, 12)}`}
								className={cn(highlighted && "citation-highlight")}
							>
								{line || "\u00A0"}
							</p>
						)
					})}
				</article>
			</div>
		</div>
	)
}
