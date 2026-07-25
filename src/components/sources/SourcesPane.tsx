import {
	ArrowLeft,
	CircleNotch,
	DotsThree,
	FileText,
	Link as LinkIcon,
	MagnifyingGlass,
	Plus,
	TextT,
} from "@phosphor-icons/react"
import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { AddSourceDialog } from "#/components/sources/AddSourceDialog"
import { Button } from "#/components/ui/button"
import { Checkbox } from "#/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu"
import { Input } from "#/components/ui/input"
import { layoutTransition } from "#/lib/motion"
import { cn } from "#/lib/utils"
import { describeRejectedFile, isAcceptedUpload } from "#/utils/file-types"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

export type SourcesPaneProps = {
	notebookId: Id<"notebooks">
	previewSourceId?: string | null
	highlightOffsets?: { start: number; end: number } | null
	onPreviewSource: (sourceId: string | null) => void
	onHighlightHandled?: () => void
}

const STATUS_LABEL: Record<string, string> = {
	pending: "Queued",
	extracting: "Extracting",
	chunking: "Chunking",
	embedding: "Embedding",
	ready: "Ready",
	failed: "Failed",
}

export function SourcesPane({
	notebookId,
	previewSourceId,
	highlightOffsets,
	onPreviewSource,
}: SourcesPaneProps) {
	const sources = useQuery(api.sources.listByNotebook, { notebookId })
	const setSelected = useMutation(api.sources.setSelected)
	const setSelectedMany = useMutation(api.sources.setSelectedMany)
	const renameSource = useMutation(api.sources.rename)
	const removeSource = useMutation(api.sources.remove)
	const retrySource = useMutation(api.sources.retry)
	const addFile = useMutation(api.sources.addFile)
	const generateUploadUrl = useMutation(api.sources.generateUploadUrl)
	const [query, setQuery] = useState("")
	const [addOpen, setAddOpen] = useState(false)
	const [dragging, setDragging] = useState(false)
	const [renameId, setRenameId] = useState<Id<"sources"> | null>(null)
	const [renameDraft, setRenameDraft] = useState("")
	const [deleteId, setDeleteId] = useState<Id<"sources"> | null>(null)
	const [uploadNotice, setUploadNotice] = useState<string | null>(null)
	const listRef = useRef<HTMLDivElement>(null)
	const scrollMemory = useRef(0)

	const filtered = useMemo(() => {
		const list = sources ?? []
		const needle = query.trim().toLowerCase()

		if (!needle) {
			return list
		}

		return list.filter((source: any) =>
			source.title.toLowerCase().includes(needle),
		)
	}, [query, sources])

	const selectable = filtered.filter(
		(source: any) => source.processingState !== "failed",
	)
	const selectedCount = selectable.filter(
		(source: any) => source.selected,
	).length
	const allSelected =
		selectable.length > 0 && selectedCount === selectable.length
	const someSelected = selectedCount > 0 && !allSelected

	const previewSource = sources?.find(
		(source: any) => source._id === previewSourceId,
	)
	const previewUrl = useQuery(
		api.sources.getNormalizedContent,
		previewSourceId ? { sourceId: previewSourceId as Id<"sources"> } : "skip",
	)
	const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null)

	useEffect(() => {
		if (!previewUrl) {
			setPreviewMarkdown(null)
			return
		}

		let cancelled = false

		void fetch(previewUrl)
			.then((response) => response.text())
			.then((text) => {
				if (!cancelled) {
					setPreviewMarkdown(text)
				}
			})
			.catch(() => {
				if (!cancelled) {
					setPreviewMarkdown("Could not load source preview.")
				}
			})

		return () => {
			cancelled = true
		}
	}, [previewUrl])

	async function uploadFiles(files: File[]) {
		const remaining = Math.max(0, 20 - (sources?.length ?? 0))
		const accepted: File[] = []
		const rejected: string[] = []

		for (const file of files) {
			if (accepted.length >= remaining) {
				rejected.push(`${file.name} exceeds the 20-source limit.`)
				continue
			}

			if (file.size > 20 * 1024 * 1024) {
				rejected.push(`${file.name} exceeds the 20MB upload limit.`)
				continue
			}

			if (!isAcceptedUpload(file.name, file.type)) {
				rejected.push(describeRejectedFile(file.name))
				continue
			}

			accepted.push(file)
		}

		for (const file of accepted) {
			const uploadUrl = await generateUploadUrl({})
			const response = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": file.type || "application/octet-stream" },
				body: file,
			})
			const { storageId } = (await response.json()) as {
				storageId: Id<"_storage">
			}
			await addFile({
				notebookId,
				storageId,
				filename: file.name,
				mimeType: file.type || undefined,
			})
		}

		if (rejected.length) {
			setUploadNotice(
				`Some files were skipped: ${rejected.slice(0, 3).join(" ")}`,
			)
		} else {
			setUploadNotice(null)
		}
	}

	if (previewSource) {
		return (
			<div className="flex h-full flex-col">
				<div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
					<Button
						variant="ghost"
						size="sm"
						className="rounded-[10px]"
						onClick={() => {
							onPreviewSource(null)
							requestAnimationFrame(() => {
								if (listRef.current) {
									listRef.current.scrollTop = scrollMemory.current
								}
							})
						}}
					>
						<ArrowLeft size={16} className="mr-1" />
						Back
					</Button>
					<div className="min-w-0 flex-1 truncate font-medium">
						{previewSource.title}
					</div>
				</div>
				<div className="flex-1 overflow-auto px-4 py-4">
					<article className="prose prose-sm dark:prose-invert max-w-none">
						{(previewMarkdown ?? "Loading preview…")
							.split("\n")
							.map((line, index) => {
								const start =
									previewMarkdown?.split("\n").slice(0, index).join("\n")
										.length ?? 0
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

	return (
		<div
			className="relative flex h-full flex-col"
			onDragEnter={(event) => {
				event.preventDefault()
				setDragging(true)
			}}
			onDragOver={(event) => event.preventDefault()}
			onDragLeave={() => setDragging(false)}
			onDrop={async (event) => {
				event.preventDefault()
				setDragging(false)
				const files = [...event.dataTransfer.files]
				if (files.length) {
					await uploadFiles(files)
				}
			}}
		>
			<div className="flex items-center justify-between gap-3 px-4 pt-4">
				<h2 className="text-sm font-semibold tracking-wide uppercase">
					Sources
				</h2>
				<Button
					size="sm"
					className="rounded-[10px]"
					onClick={() => setAddOpen(true)}
				>
					<Plus size={14} className="mr-1" />
					Add
				</Button>
			</div>

			{uploadNotice ? (
				<p className="px-4 pt-2 text-sm text-destructive" role="status">
					{uploadNotice}
				</p>
			) : null}

			<div className="relative px-4 pt-3">
				<MagnifyingGlass
					size={14}
					className="pointer-events-none absolute top-1/2 left-7 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search sources"
					className="rounded-xl pl-8"
					aria-label="Search sources"
				/>
			</div>

			<div className="flex items-center gap-2 px-4 py-3 text-sm">
				<Checkbox
					checked={allSelected ? true : someSelected ? "indeterminate" : false}
					onCheckedChange={(checked) =>
						void setSelectedMany({
							notebookId,
							sourceIds: selectable.map((source: any) => source._id),
							selected: checked === true,
						})
					}
					aria-label="Select all visible sources"
				/>
				<span className="tabular-nums text-muted-foreground">
					{selectedCount}/{selectable.length} selected
				</span>
			</div>

			<div ref={listRef} className="relative flex-1 overflow-auto px-2 pb-4">
				<AnimatePresence initial={false}>
					{(filtered ?? []).map((source: any) => {
						const Icon =
							source.kind === "url"
								? LinkIcon
								: source.kind === "file"
									? FileText
									: TextT
						const busy =
							source.processingState !== "ready" &&
							source.processingState !== "failed"

						return (
							<motion.div
								layout
								key={source._id}
								transition={layoutTransition}
								className="group mb-1 flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-muted/60"
							>
								<button
									type="button"
									className="flex min-w-0 flex-1 items-start gap-2 text-left"
									onClick={() => {
										scrollMemory.current = listRef.current?.scrollTop ?? 0
										onPreviewSource(source._id)
									}}
								>
									<span className="mt-0.5 text-primary">
										{busy ? (
											<CircleNotch size={18} className="animate-spin" />
										) : (
											<Icon size={18} />
										)}
									</span>
									<span className="min-w-0">
										<span className="line-clamp-2 text-sm font-medium">
											{source.title}
										</span>
										<span className="mt-0.5 block text-xs text-muted-foreground">
											{source.processingState === "failed"
												? source.errorCode || "Failed"
												: STATUS_LABEL[source.processingState]}
										</span>
									</span>
								</button>
								<div className="flex items-center gap-1">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon-xs"
												className="rounded-[10px] opacity-100 touch-manipulation md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
												aria-label={`Source menu for ${source.title}`}
											>
												<DotsThree size={16} weight="bold" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="rounded-xl">
											<DropdownMenuItem
												onClick={() => {
													setRenameId(source._id)
													setRenameDraft(source.title)
												}}
											>
												Rename
											</DropdownMenuItem>
											{source.processingState === "failed" ? (
												<DropdownMenuItem
													onClick={() =>
														void retrySource({ sourceId: source._id })
													}
												>
													Retry
												</DropdownMenuItem>
											) : null}
											<DropdownMenuItem
												variant="destructive"
												onClick={() => setDeleteId(source._id)}
											>
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
									<Checkbox
										checked={source.selected}
										disabled={source.processingState === "failed"}
										onCheckedChange={(checked) =>
											void setSelected({
												sourceId: source._id,
												selected: checked === true,
											})
										}
										aria-label={`Select ${source.title}`}
									/>
								</div>
							</motion.div>
						)
					})}
				</AnimatePresence>
			</div>

			{dragging ? (
				<div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5" />
			) : null}

			<AddSourceDialog
				open={addOpen}
				onOpenChange={setAddOpen}
				notebookId={notebookId}
				onFiles={uploadFiles}
			/>

			<Dialog
				open={!!renameId}
				onOpenChange={(open) => !open && setRenameId(null)}
			>
				<DialogContent className="rounded-2xl sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Rename source</DialogTitle>
					</DialogHeader>
					<Input
						value={renameDraft}
						onChange={(event) => setRenameDraft(event.target.value)}
						className="rounded-xl"
						autoFocus
						onFocus={(event) => event.currentTarget.select()}
					/>
					<DialogFooter>
						<Button
							className="rounded-[10px]"
							onClick={async () => {
								if (!renameId) {
									return
								}

								await renameSource({ sourceId: renameId, title: renameDraft })
								setRenameId(null)
							}}
						>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={!!deleteId}
				onOpenChange={(open) => !open && setDeleteId(null)}
			>
				<DialogContent className="rounded-2xl sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Delete source</DialogTitle>
						<DialogDescription>
							This removes the upload, normalized content, chunks, and
							embeddings. Citation excerpts already saved in chat remain until
							chat or notebook deletion.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							className="rounded-[10px]"
							onClick={() => setDeleteId(null)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							className="rounded-[10px]"
							onClick={async () => {
								if (!deleteId) {
									return
								}

								await removeSource({ sourceId: deleteId })
								setDeleteId(null)
							}}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
