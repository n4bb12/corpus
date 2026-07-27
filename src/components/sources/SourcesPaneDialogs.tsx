import { AddSourceDialog } from "src/components/sources/AddSourceDialog"
import { SourceDeleteDialog } from "src/components/sources/SourceDeleteDialog"
import { SourceRenameDialog } from "src/components/sources/SourceRenameDialog"
import type { Id } from "src/convex/_generated/dataModel"

export type SourcesPaneDialogsProps = {
  notebookId: Id<"notebooks">
  addOpen: boolean
  onAddOpenChange: (open: boolean) => void
  onFiles: (files: File[]) => Promise<void>
  renameId: Id<"sources"> | null
  renameDraft: string
  onRenameDraftChange: (value: string) => void
  onRenameIdChange: (id: Id<"sources"> | null) => void
  onRenameSave: () => Promise<void>
  deleteId: Id<"sources"> | null
  onDeleteIdChange: (id: Id<"sources"> | null) => void
  onDeleteConfirm: () => Promise<void>
}

export function SourcesPaneDialogs({
  notebookId,
  addOpen,
  onAddOpenChange,
  onFiles,
  renameId,
  renameDraft,
  onRenameDraftChange,
  onRenameIdChange,
  onRenameSave,
  deleteId,
  onDeleteIdChange,
  onDeleteConfirm,
}: SourcesPaneDialogsProps) {
  return (
    <>
      <AddSourceDialog
        open={addOpen}
        onOpenChange={onAddOpenChange}
        notebookId={notebookId}
        onFiles={onFiles}
      />

      <SourceRenameDialog
        open={!!renameId}
        title={renameDraft}
        onTitleChange={onRenameDraftChange}
        onOpenChange={(open) => {
          if (!open) {
            onRenameIdChange(null)
          }
        }}
        onSave={onRenameSave}
      />

      <SourceDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) {
            onDeleteIdChange(null)
          }
        }}
        onConfirm={onDeleteConfirm}
      />
    </>
  )
}
