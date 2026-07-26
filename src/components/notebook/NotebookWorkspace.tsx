import { AnimatePresence, motion } from "motion/react"
import { ChatPane } from "src/components/chat/ChatPane"
import { SourcesPane } from "src/components/sources/SourcesPane"
import type { Id } from "src/convex/_generated/dataModel"
import { layoutTransition } from "src/lib/motion"
import { cn } from "src/lib/utils"

export type NotebookWorkspaceProps = {
	notebookId: string
	tab: "sources" | "chat"
	previewSourceId: string | null
	highlight: { start: number; end: number } | null
	addSourceOpen: boolean
	onPreviewSource: (sourceId: string | null) => void
	onAddSourceOpenChange: (open: boolean) => void
	onTabChange: (tab: "sources" | "chat") => void
	onExcerptOnly: (excerpt: string | null) => void
	onHighlight: (highlight: { start: number; end: number } | null) => void
}

export function NotebookWorkspace({
	notebookId,
	tab,
	previewSourceId,
	highlight,
	addSourceOpen,
	onPreviewSource,
	onAddSourceOpenChange,
	onTabChange,
	onExcerptOnly,
	onHighlight,
}: NotebookWorkspaceProps) {
	return (
		<div className="flex min-h-0 flex-1">
			<aside
				className={cn(
					"w-full border-r border-border md:block md:w-[25rem] md:shrink-0",
					tab === "sources" ? "block" : "hidden",
				)}
			>
				<SourcesPane
					notebookId={notebookId as Id<"notebooks">}
					previewSourceId={previewSourceId}
					highlightOffsets={highlight}
					onPreviewSource={onPreviewSource}
					addOpen={addSourceOpen}
					onAddOpenChange={onAddSourceOpenChange}
				/>
			</aside>

			<section
				className={cn(
					"min-w-0 flex-1",
					tab === "chat" ? "block" : "hidden md:block",
				)}
			>
				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={tab}
						className="h-full"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={layoutTransition}
					>
						<ChatPane
							notebookId={notebookId as Id<"notebooks">}
							onOpenSources={() => {
								onPreviewSource(null)
								onTabChange("sources")
							}}
							onAddSource={() => {
								onPreviewSource(null)
								onTabChange("sources")
								onAddSourceOpenChange(true)
							}}
							onCite={({
								sourceId,
								startOffset,
								endOffset,
								excerpt,
								canNavigate,
							}) => {
								if (!canNavigate || !sourceId) {
									onExcerptOnly(excerpt)
									return
								}

								onPreviewSource(sourceId)
								onHighlight(
									typeof startOffset === "number" &&
										typeof endOffset === "number"
										? { start: startOffset, end: endOffset }
										: null,
								)
								onTabChange("sources")
							}}
						/>
					</motion.div>
				</AnimatePresence>
			</section>
		</div>
	)
}
