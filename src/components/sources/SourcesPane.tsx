import { Plus, Search } from "lucide-react"
import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { AnimatePresence } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { AddSourceDialog } from "src/components/sources/AddSourceDialog"
import { SourceDeleteDialog } from "src/components/sources/SourceDeleteDialog"
import { SourceListItem } from "src/components/sources/SourceListItem"
import { SourcePreview } from "src/components/sources/SourcePreview"
import { SourceRenameDialog } from "src/components/sources/SourceRenameDialog"
import { Button } from "src/components/ui/button"
import { Checkbox } from "src/components/ui/checkbox"
import { Input } from "src/components/ui/input"
import { describeRejectedFile, isAcceptedUpload } from "src/convex/lib/file-types"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"

export type SourcesPaneProps = {
	notebookId: Id<"notebooks">
	previewSourceId?: string | null
	highlightOffsets?: { start: number; end: number } | null
	onPreviewSource: (sourceId: string | null) => void
	onHighlightHandled?: () => void
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

		return list.filter((source) => source.title.toLowerCase().includes(needle))
	}, [query, sources])

	const selectable = filtered.filter(
		(source) => source.processingState !== "failed",
	)
	const selectedCount = selectable.filter((source) => source.selected).length
	const allSelected =
		selectable.length > 0 && selectedCount === selectable.length
	const someSelected = selectedCount > 0 && !allSelected

	const previewSource = sources?.find((source) => source._id === previewSourceId)
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
			<SourcePreview
				title={previewSource.title}
				markdown={previewMarkdown}
				highlightOffsets={highlightOffsets}
				onBack={() => {
					onPreviewSource(null)
					requestAnimationFrame(() => {
						if (listRef.current) {
							listRef.current.scrollTop = scrollMemory.current
						}
					})
				}}
			/>
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
					className="rounded-sm"
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
				<Search
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
							sourceIds: selectable.map((source) => source._id),
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
					{filtered.map((source) => (
						<SourceListItem
							key={source._id}
							source={source}
							onPreview={() => {
								scrollMemory.current = listRef.current?.scrollTop ?? 0
								onPreviewSource(source._id)
							}}
							onRename={() => {
								setRenameId(source._id)
								setRenameDraft(source.title)
							}}
							onRetry={() => void retrySource({ sourceId: source._id })}
							onDelete={() => setDeleteId(source._id)}
							onSelect={(selected) =>
								void setSelected({ sourceId: source._id, selected })
							}
						/>
					))}
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

			<SourceRenameDialog
				open={!!renameId}
				title={renameDraft}
				onTitleChange={setRenameDraft}
				onOpenChange={(open) => {
					if (!open) {
						setRenameId(null)
					}
				}}
				onSave={async () => {
					if (!renameId) {
						return
					}

					await renameSource({ sourceId: renameId, title: renameDraft })
					setRenameId(null)
				}}
			/>

			<SourceDeleteDialog
				open={!!deleteId}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteId(null)
					}
				}}
				onConfirm={async () => {
					if (!deleteId) {
						return
					}

					await removeSource({ sourceId: deleteId })
					setDeleteId(null)
				}}
			/>
		</div>
	)
}
