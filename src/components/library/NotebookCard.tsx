import { DotsThree, Notebook } from "@phosphor-icons/react"
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
import { layoutTransition } from "src/lib/motion"
import { cn } from "src/lib/utils"

export type NotebookCardProps = {
	notebookId: string
	title: string
	lastUsedLabel: string
	sourceCount: number
	loading?: boolean
	onOpen: () => void
	onRename: (title: string) => Promise<void>
	onDelete: () => Promise<void>
}

export function NotebookCard({
	title,
	lastUsedLabel,
	sourceCount,
	loading = false,
	onOpen,
	onRename,
	onDelete,
}: NotebookCardProps) {
	const [renameOpen, setRenameOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [draft, setDraft] = useState(title)

	return (
		<>
			<motion.div
				layout
				transition={layoutTransition}
				whileHover={loading ? undefined : { y: -2 }}
				className={cn(
					"group relative rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-pine)] transition-shadow duration-120",
					"max-sm:flex max-sm:items-center max-sm:gap-3",
					loading && "pointer-events-none",
				)}
			>
				<button
					type="button"
					className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
					onClick={onOpen}
					tabIndex={loading ? -1 : 0}
					aria-hidden={loading}
					aria-label={loading ? undefined : `Open ${title}`}
				/>
				<div
					className={cn(
						"relative z-10 flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary",
						loading && "placeholder-shimmer",
					)}
					aria-hidden={loading}
				>
					<Notebook size={22} />
				</div>
				<div className="relative z-10 mt-4 min-w-0 flex-1 max-sm:mt-0">
					<h2
						className={cn(
							"line-clamp-2 text-base font-semibold tracking-tight",
							loading && "placeholder-shimmer",
						)}
						aria-hidden={loading}
					>
						{title}
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
				<div className="relative z-20 mt-3 flex justify-end max-sm:mt-0">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="rounded-[10px] opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
								aria-label={`Notebook menu for ${title}`}
								disabled={loading}
							>
								<DotsThree size={18} weight="bold" />
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
						autoFocus
					/>
					<DialogFooter>
						<Button
							variant="outline"
							className="rounded-[10px]"
							onClick={() => setRenameOpen(false)}
						>
							Cancel
						</Button>
						<Button
							className="rounded-[10px]"
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
							Permanently delete “{title}”? Messages, citations, sources, and
							files will be removed. This cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							className="rounded-[10px]"
							onClick={() => setDeleteOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							className="rounded-[10px]"
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
