import type { RefObject } from "react"
import { useMemo } from "react"
import { AddSourceCard } from "src/components/sources/AddSourceCard"
import { SourceListItem } from "src/components/sources/SourceListItem"
import { SourcesSelectAll } from "src/components/sources/SourcesSelectAll"
import { UploadingSourceListItem } from "src/components/sources/UploadingSourceListItem"
import { ScrollArea } from "src/components/ui/shadcn/scroll-area"
import type { Doc, Id } from "src/convex/_generated/dataModel"
import type { UploadingSource } from "src/lib/uploadingSources"

export type SourcesListProps = {
  notebookId: Id<"notebooks">
  listRef: RefObject<HTMLDivElement | null>
  filtered: Doc<"sources">[]
  uploading: UploadingSource[]
  selectable: Doc<"sources">[]
  selectedCount: number
  onAdd: () => void
  onSelectMany: (args: {
    notebookId: Id<"notebooks">
    sourceIds: Id<"sources">[]
    selected: boolean
  }) => void
  onPreview: (sourceId: Id<"sources">) => void
  onRename: (source: Doc<"sources">) => void
  onRetry: (sourceId: Id<"sources">) => void
  onDelete: (sourceId: Id<"sources">) => void
  onSelect: (sourceId: Id<"sources">, selected: boolean) => void
}

export function SourcesList({
  notebookId,
  listRef,
  filtered,
  uploading,
  selectable,
  selectedCount,
  onAdd,
  onSelectMany,
  onPreview,
  onRename,
  onRetry,
  onDelete,
  onSelect,
}: SourcesListProps) {
  const selectableIds = useMemo(
    () => selectable.map((source) => source._id),
    [selectable],
  )

  return (
    <ScrollArea
      viewportRef={listRef}
      wheelSpeed={2.25}
      className="min-h-0 flex-1 overflow-hidden p-4"
    >
      <div className="flex flex-col gap-1">
        <AddSourceCard onClick={onAdd} />
        <SourcesSelectAll
          notebookId={notebookId}
          sourceIds={selectableIds}
          selectedCount={selectedCount}
          pendingCount={uploading.length}
          onSelectMany={onSelectMany}
        />
        {uploading.map((source) => (
          <UploadingSourceListItem key={source.localId} source={source} />
        ))}
        {filtered.map((source) => (
          <SourceListItem
            key={source._id}
            source={source}
            onPreview={onPreview}
            onRename={onRename}
            onRetry={onRetry}
            onDelete={onDelete}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
