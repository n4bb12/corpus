import { Link } from "@tanstack/react-router"
import { motion } from "motion/react"
import { useState } from "react"
import { NotebookCardContent } from "src/components/library/NotebookCardContent"
import { NotebookCardMenu } from "src/components/library/NotebookCardMenu"
import { NotebookDeleteDialog } from "src/components/library/NotebookDeleteDialog"
import { NotebookRenameDialog } from "src/components/library/NotebookRenameDialog"
import { Bezel } from "src/components/ui/Bezel"
import { displayNotebookTitle } from "src/lib/limits"
import { layoutTransition } from "src/lib/motion"
import { cn } from "src/lib/utils"

export type NotebookCardProps = {
	notebookId: string
	title: string
	lastUsedLabel: string
	sourceCount: number
	featured?: boolean
	onRename: (title: string) => Promise<void>
	onDelete: () => Promise<void>
}

export function NotebookCard({
	notebookId,
	title,
	lastUsedLabel,
	sourceCount,
	featured = false,
	onRename,
	onDelete,
}: NotebookCardProps) {
	const [renameOpen, setRenameOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [draft, setDraft] = useState(title)
	const label = displayNotebookTitle(title)

	return (
		<>
			<motion.div
				layout
				transition={layoutTransition}
				className="group relative h-full transition-transform duration-(--duration-hover) ease-spring hover:-translate-y-0.5"
			>
				<Bezel
					className="h-full shadow-(--shadow-pine)"
					innerClassName={cn(
						"relative h-full p-5 max-sm:flex max-sm:items-center max-sm:gap-3",
						featured && "md:min-h-[14rem] md:p-7",
					)}
				>
					<Link
						to="/notebooks/$notebookId"
						params={{ notebookId }}
						search={{ tab: "chat" }}
						className="absolute inset-0 z-0 rounded-[1.125rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						aria-label={`Open ${label}`}
					/>
					<NotebookCardContent
						label={label}
						lastUsedLabel={lastUsedLabel}
						sourceCount={sourceCount}
						featured={featured}
					/>
					<NotebookCardMenu
						label={label}
						onRename={() => {
							setDraft(title)
							setRenameOpen(true)
						}}
						onDelete={() => setDeleteOpen(true)}
					/>
				</Bezel>
			</motion.div>

			<NotebookRenameDialog
				open={renameOpen}
				draft={draft}
				onDraftChange={setDraft}
				onOpenChange={setRenameOpen}
				onSave={async () => {
					await onRename(draft)
					setRenameOpen(false)
				}}
			/>

			<NotebookDeleteDialog
				open={deleteOpen}
				label={label}
				onOpenChange={setDeleteOpen}
				onConfirm={async () => {
					await onDelete()
					setDeleteOpen(false)
				}}
			/>
		</>
	)
}
