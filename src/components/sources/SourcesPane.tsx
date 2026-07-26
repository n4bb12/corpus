import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { Search, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { AddSourceCard } from "src/components/sources/AddSourceCard"
import { AddSourceDialog } from "src/components/sources/AddSourceDialog"
import { SourceDeleteDialog } from "src/components/sources/SourceDeleteDialog"
import { SourceListItem } from "src/components/sources/SourceListItem"
import { SourcePreview } from "src/components/sources/SourcePreview"
import { SourceRenameDialog } from "src/components/sources/SourceRenameDialog"
import { Checkbox } from "src/components/ui/checkbox"
import { Input } from "src/components/ui/input"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { describeRejectedFile, isAcceptedUpload } from "src/lib/file_types"
import { startSourceIngest } from "src/lib/ingest-client"
import { useSignedInQueryArgs } from "src/lib/use-signed-in"

export type SourcesPaneProps = {
	notebookId: Id<"notebooks">
	previewSourceId?: string | null
	highlightOffsets?: { start: number; end: number } | null
	onPreviewSource: (sourceId: string | null) => void
	onHighlightHandled?: () => void
	addOpen?: boolean
	onAddOpenChange?: (open: boolean) => void
}

export function SourcesPane({
	notebookId,
	previewSourceId,
	highlightOffsets,
	onPreviewSource,
	addOpen: addOpenControlled,
	onAddOpenChange,
}: SourcesPaneProps) {
	const sources = useQuery(
		api.sources.listByNotebook,
		useSignedInQueryArgs({ notebookId }),
	)
	const setSelected = useMutation(api.sources.setSelected)
	const setSelectedMany = useMutation(api.sources.setSelectedMany)
	const renameSource = useMutation(api.sources.rename)
	const removeSource = useMutation(api.sources.remove)
	const generateUploadUrl = useMutation(api.sources.generateUploadUrl)
	const [query, setQuery] = useState("")
	const [addOpenUncontrolled, setAddOpenUncontrolled] = useState(false)
	const addOpen = addOpenControlled ?? addOpenUncontrolled
	const setAddOpen = onAddOpenChange ?? setAddOpenUncontrolled
	const [dragging, setDragging] = useState(false)
	const [renameId, setRenameId] = useState<Id<"sources"> | null>(null)
	const [renameDraft, setRenameDraft] = useState("")
	const [deleteId, setDeleteId] = useState<Id<"sources"> | null>(null)
	const [uploadNotice, setUploadNotice] = useState<string | null>(null)
	const listRef = useRef<HTMLDivElement>(null)
	const scrollMemory = useRef(0)

	const filtered = useMemo(() => {
		const list = sources ?? []
		const showSearch = list.length >= 6
		const needle = showSearch ? query.trim().toLowerCase() : ""

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

	const previewSource = sources?.find(
		(source) => source._id === previewSourceId,
	)
	const previewUrl = useQuery(
		api.sources.getNormalizedContent,
		useSignedInQueryArgs(
			previewSourceId ? { sourceId: previewSourceId as Id<"sources"> } : "skip",
		),
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
			await startSourceIngest({
				action: "create",
				kind: "file",
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
			<div className="flex flex-col gap-3 px-4 pt-4">
				<div className="flex h-10 items-center justify-between gap-3">
					<h2 className="text-sm font-semibold tracking-wide uppercase">
						Sources
					</h2>
					<p className="text-sm tabular-nums text-muted-foreground">
						{sources?.length ?? 0} sources
					</p>
				</div>

				{uploadNotice ? (
					<p className="text-sm text-destructive" role="status">
						{uploadNotice}
					</p>
				) : null}

				{(sources?.length ?? 0) >= 6 ? (
					<div className="relative">
						<Search
							size={14}
							className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search sources"
							className={query ? "rounded-xl pr-9 pl-9" : "rounded-xl pl-9"}
							aria-label="Search sources"
						/>
						{query ? (
							<button
								type="button"
								className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								aria-label="Clear search"
								onClick={() => setQuery("")}
							>
								<X size={16} />
							</button>
						) : null}
					</div>
				) : null}
			</div>

			<div
				ref={listRef}
				className="relative mt-3 flex-1 overflow-auto px-4 pb-4"
			>
				<div className="flex flex-col gap-1">
					<AddSourceCard onClick={() => setAddOpen(true)} />
					{selectable.length ? (
						<div className="flex items-center justify-end gap-2 px-2 py-1.5 text-sm">
							<label
								htmlFor="select-all-sources"
								className="cursor-pointer tabular-nums text-muted-foreground"
							>
								{selectedCount}/{selectable.length} selected
							</label>
							<div className="flex items-center gap-1">
								<span className="size-6 shrink-0" aria-hidden />
								<Checkbox
									id="select-all-sources"
									checked={
										allSelected ? true : someSelected ? "indeterminate" : false
									}
									onCheckedChange={(checked) =>
										void setSelectedMany({
											notebookId,
											sourceIds: selectable.map((source) => source._id),
											selected: checked === true,
										})
									}
								/>
							</div>
						</div>
					) : null}
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
							onRetry={() =>
								void startSourceIngest({
									action: "retry",
									sourceId: source._id,
								})
							}
							onDelete={() => setDeleteId(source._id)}
							onSelect={(selected) =>
								void setSelected({ sourceId: source._id, selected })
							}
						/>
					))}
				</div>
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
