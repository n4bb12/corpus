import { SourcePreview } from "src/components/sources/SourcePreview"
import { SourcesList } from "src/components/sources/SourcesList"
import { SourcesPaneDialogs } from "src/components/sources/SourcesPaneDialogs"
import { SourcesPaneHeader } from "src/components/sources/SourcesPaneHeader"
import { useSourcesPane } from "src/components/sources/useSourcesPane"
import type { Id } from "src/convex/_generated/dataModel"

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
	const pane = useSourcesPane({
		notebookId,
		previewSourceId,
		addOpenControlled,
		onAddOpenChange,
	})

	if (pane.previewSource) {
		return (
			<SourcePreview
				title={pane.previewSource.title}
				markdown={pane.previewMarkdown}
				highlightOffsets={highlightOffsets}
				onBack={() => {
					onPreviewSource(null)
					requestAnimationFrame(() => {
						if (pane.listRef.current) {
							pane.listRef.current.scrollTop = pane.scrollMemory.current
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
				pane.setDragging(true)
			}}
			onDragOver={(event) => event.preventDefault()}
			onDragLeave={() => pane.setDragging(false)}
			onDrop={async (event) => {
				event.preventDefault()
				pane.setDragging(false)
				const files = [...event.dataTransfer.files]

				if (files.length) {
					await pane.uploadFiles(files)
				}
			}}
		>
			<SourcesPaneHeader
				sourceCount={pane.sources?.length ?? 0}
				uploadNotice={pane.uploadNotice}
				query={pane.query}
				onQueryChange={pane.setQuery}
			/>

			<SourcesList
				notebookId={notebookId}
				listRef={pane.listRef}
				filtered={pane.filtered}
				selectable={pane.selectable}
				selectedCount={pane.selectedCount}
				allSelected={pane.allSelected}
				someSelected={pane.someSelected}
				onAdd={() => pane.setAddOpen(true)}
				onSelectMany={pane.handleSelectMany}
				onPreview={(sourceId) => {
					pane.scrollMemory.current = pane.listRef.current?.scrollTop ?? 0
					onPreviewSource(sourceId)
				}}
				onRename={pane.beginRename}
				onRetry={pane.handleRetry}
				onDelete={pane.handleDelete}
				onSelect={pane.handleSelect}
			/>

			{pane.dragging ? (
				<div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5" />
			) : null}

			<SourcesPaneDialogs
				notebookId={notebookId}
				addOpen={pane.addOpen}
				onAddOpenChange={pane.setAddOpen}
				onFiles={pane.uploadFiles}
				renameId={pane.renameId}
				renameDraft={pane.renameDraft}
				onRenameDraftChange={pane.setRenameDraft}
				onRenameIdChange={pane.setRenameId}
				onRenameSave={pane.saveRename}
				deleteId={pane.deleteId}
				onDeleteIdChange={pane.setDeleteId}
				onDeleteConfirm={pane.confirmDelete}
			/>
		</div>
	)
}
