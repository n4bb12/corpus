import type { RefObject } from "react"
import { useMemo } from "react"
import { AddSourceCard } from "src/components/sources/AddSourceCard"
import { SourceListItem } from "src/components/sources/SourceListItem"
import { SourcesSelectAll } from "src/components/sources/SourcesSelectAll"
import { ScrollArea } from "src/components/ui/shadcn/scroll-area"
import type { Doc, Id } from "src/convex/_generated/dataModel"
import {
  mergeSourcesListEntries,
  type UploadingSource,
} from "src/lib/uploadingSources"

export type SourcesListProps = {
  notebookId: Id<"notebooks">
  listRef: RefObject<HTMLDivElement | null>
  filtered: Doc<"sources">[]
  uploading: UploadingSource[]
  rowKeyBySourceId: Record<string, string>
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
  rowKeyBySourceId,
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
  const entries = useMemo(
    () => mergeSourcesListEntries(uploading, filtered, rowKeyBySourceId),
    [filtered, rowKeyBySourceId, uploading],
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

        {entries.map((entry) => (
          <SourceListItem
            key={entry.key}
            entry={entry}
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
