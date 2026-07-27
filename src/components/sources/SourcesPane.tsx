import type { SourcePreviewHighlight } from "src/components/sources/SourcePreview"
import { SourcePreview } from "src/components/sources/SourcePreview"
import { SourcesList } from "src/components/sources/SourcesList"
import { SourcesPaneDialogs } from "src/components/sources/SourcesPaneDialogs"
import { SourcesPaneHeader } from "src/components/sources/SourcesPaneHeader"
import { useSourcesPaneData } from "src/components/sources/useSourcesPaneData"
import type { Id } from "src/convex/_generated/dataModel"
import { useEventCallback } from "src/lib/useEventCallback"

export type SourcesPaneProps = {
  notebookId: Id<"notebooks">
  previewSourceId?: string | null
  highlight?: SourcePreviewHighlight | null
  onPreviewSource: (sourceId: string | null) => void
  onExcerptFallback?: (excerpt: string) => void
  addOpen?: boolean
  onAddOpenChange?: (open: boolean) => void
}

export function SourcesPane({
  notebookId,
  previewSourceId,
  highlight,
  onPreviewSource,
  onExcerptFallback,
  addOpen: addOpenControlled,
  onAddOpenChange,
}: SourcesPaneProps) {
  const pane = useSourcesPaneData({
    notebookId,
    previewSourceId,
    addOpenControlled,
    onAddOpenChange,
  })

  const handlePreview = useEventCallback((sourceId: Id<"sources">) => {
    pane.scrollMemory.current = pane.listRef.current?.scrollTop ?? 0
    onPreviewSource(sourceId)
  })
  const handleAdd = useEventCallback(() => {
    pane.setAddOpen(true)
  })
  const handleHighlightUnresolved = useEventCallback((excerpt: string) => {
    onExcerptFallback?.(excerpt)
  })

  const dialogs = (
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
  )

  if (pane.previewSource) {
    return (
      <>
        <SourcePreview
          title={pane.previewSource.title}
          markdown={pane.previewMarkdown}
          highlight={highlight}
          onHighlightUnresolved={handleHighlightUnresolved}
          onBack={() => {
            onPreviewSource(null)
            requestAnimationFrame(() => {
              if (pane.listRef.current) {
                pane.listRef.current.scrollTop = pane.scrollMemory.current
              }
            })
          }}
        />
        {dialogs}
      </>
    )
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
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
      <div className="shrink-0">
        <SourcesPaneHeader
          sourceCount={pane.sources?.length ?? 0}
          sourcesLoading={pane.sources === undefined}
          uploadNotice={pane.uploadNotice}
          query={pane.query}
          onQueryChange={pane.setQuery}
        />
      </div>

      <SourcesList
        notebookId={notebookId}
        listRef={pane.listRef}
        filtered={pane.filtered}
        uploading={pane.uploading}
        rowKeyBySourceId={pane.rowKeyBySourceId}
        selectable={pane.selectable}
        selectedCount={pane.selectedCount}
        onAdd={handleAdd}
        onSelectMany={pane.handleSelectMany}
        onPreview={handlePreview}
        onRename={pane.beginRename}
        onRetry={pane.handleRetry}
        onDelete={pane.handleDelete}
        onSelect={pane.handleSelect}
      />

      {pane.dragging ? (
        <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5" />
      ) : null}

      {dialogs}
    </div>
  )
}
