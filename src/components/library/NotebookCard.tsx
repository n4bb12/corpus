import { Link } from "@tanstack/react-router"
import { MoreHorizontal, Notebook } from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"
import { Button } from "src/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "src/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu"
import { Input } from "src/components/ui/input"
import { displayNotebookTitle } from "src/lib/limits"
import { layoutTransition } from "src/lib/motion"
import { cn } from "src/lib/utils"

export type NotebookCardProps = {
	notebookId: string
	title: string
	lastUsedLabel: string
	sourceCount: number
	loading?: boolean
	onRename: (title: string) => Promise<void>
	onDelete: () => Promise<void>
}

export function NotebookCard({
	notebookId,
	title,
	lastUsedLabel,
	sourceCount,
	loading = false,
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
				whileHover={loading ? undefined : { y: -2 }}
				className={cn(
					"group relative rounded-2xl border border-border bg-card p-4 shadow-(--shadow-pine) transition-shadow duration-120",
					"max-sm:flex max-sm:items-center max-sm:gap-3",
					loading && "pointer-events-none",
				)}
			>
				{loading ? null : (
					<Link
						to="/notebooks/$notebookId"
						params={{ notebookId }}
						search={{ tab: "chat" }}
						className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						aria-label={`Open ${label}`}
					/>
				)}
				<div
					className={cn(
						"pointer-events-none relative z-10 flex size-11 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary",
						loading && "placeholder-shimmer",
					)}
					aria-hidden={loading}
				>
					<Notebook size={22} />
				</div>
				<div className="pointer-events-none relative z-10 mt-4 min-w-0 flex-1 max-sm:mt-0 max-sm:pr-10">
					<h2
						className={cn(
							"line-clamp-2 text-base font-semibold tracking-tight",
							loading && "placeholder-shimmer",
						)}
						aria-hidden={loading}
					>
						{label}
					</h2>
					<p
						className={cn(
							"mt-2 text-sm text-muted-foreground tabular-nums",
							loading && "placeholder-shimmer",
						)}
						aria-hidden={loading}
					>
						{lastUsedLabel}
					</p>
					<p
						className={cn(
							"mt-1 text-sm text-muted-foreground tabular-nums",
							loading && "placeholder-shimmer",
						)}
						aria-hidden={loading}
					>
						{sourceCount} sources
					</p>
				</div>
				<div className="absolute top-2 right-2 z-20 max-sm:top-1/2 max-sm:-translate-y-1/2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="pointer-events-auto rounded-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
								aria-label={`Notebook menu for ${label}`}
								disabled={loading}
								onClick={(event) => event.preventDefault()}
							>
								<MoreHorizontal size={18} />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="rounded-xl">
							<DropdownMenuItem
								onClick={(event) => {
									event.stopPropagation()
									setDraft(title)
									setRenameOpen(true)
								}}
							>
								Rename
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={(event) => {
									event.stopPropagation()
									setDeleteOpen(true)
								}}
							>
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</motion.div>

			<Dialog open={renameOpen} onOpenChange={setRenameOpen}>
				<DialogContent className="rounded-2xl sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Rename notebook</DialogTitle>
						<DialogDescription>
							Titles can be 1–100 characters. Duplicates are allowed.
						</DialogDescription>
					</DialogHeader>
					<Input
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						className="rounded-xl"
						maxLength={100}
						placeholder={displayNotebookTitle("")}
						autoFocus
					/>
					<DialogFooter>
						<Button
							variant="outline"
							className="rounded-sm"
							onClick={() => setRenameOpen(false)}
						>
							Cancel
						</Button>
						<Button
							className="rounded-sm"
							onClick={async () => {
								await onRename(draft)
								setRenameOpen(false)
							}}
						>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent className="rounded-2xl sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Delete notebook</DialogTitle>
						<DialogDescription>
							Permanently delete “{label}”? Messages, citations, sources, and
							files will be removed. This cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							className="rounded-sm"
							onClick={() => setDeleteOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							className="rounded-sm"
							onClick={async () => {
								await onDelete()
								setDeleteOpen(false)
							}}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
