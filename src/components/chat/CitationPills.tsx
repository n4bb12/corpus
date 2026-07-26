import { CitationPill } from "src/components/chat/CitationPill"
import { TooltipProvider } from "src/components/ui/tooltip"

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

	return (
		<TooltipProvider delayDuration={150} skipDelayDuration={0}>
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
							title={citation.liveTitle}
							excerpt={citation.excerpt}
							canNavigate={citation.canNavigate}
							onOpen={() =>
								onCite({
									sourceId: citation.sourceId,
									startOffset: citation.locator?.startOffset,
									endOffset: citation.locator?.endOffset,
									excerpt: citation.excerpt,
									canNavigate: citation.canNavigate,
								})
							}
						/>
					)
				})}
			</div>
		</TooltipProvider>
	)
}
