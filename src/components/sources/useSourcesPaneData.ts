import { useRef, useState } from "react"
import { useSourceDelete } from "src/components/sources/useSourceDelete"
import { useSourcePreviewMarkdownData } from "src/components/sources/useSourcePreviewMarkdownData"
import { useSourceRename } from "src/components/sources/useSourceRename"
import { useSourceSelection } from "src/components/sources/useSourceSelection"
import { useSourcesList } from "src/components/sources/useSourcesList"
import { useSourceUpload } from "src/components/sources/useSourceUpload"
import type { Id } from "src/convex/_generated/dataModel"
import { startSourceIngest } from "src/lib/ingestClient"
import { useEventCallback } from "src/lib/useEventCallback"

export function useSourcesPaneData({
  notebookId,
  previewSourceId,
  addOpenControlled,
  onAddOpenChange,
}: {
  notebookId: Id<"notebooks">
  previewSourceId?: string | null
  addOpenControlled?: boolean
  onAddOpenChange?: (open: boolean) => void
}) {
  const list = useSourcesList(notebookId)
  const selection = useSourceSelection()
  const upload = useSourceUpload({
    notebookId,
    sourceCount: list.sources?.length ?? 0,
    uploadingCount: list.uploadingCount,
  })
  const rename = useSourceRename()
  const sourceDelete = useSourceDelete()
  const [addOpenUncontrolled, setAddOpenUncontrolled] = useState(false)
  const addOpen = addOpenControlled ?? addOpenUncontrolled
  const setAddOpen = onAddOpenChange ?? setAddOpenUncontrolled
  const listRef = useRef<HTMLDivElement>(null)
  const scrollMemory = useRef(0)
  const previewMarkdown = useSourcePreviewMarkdownData(previewSourceId)
  const previewSource = list.sources?.find(
    (source) => source._id === previewSourceId,
  )

  const handleRetry = useEventCallback((sourceId: Id<"sources">) => {
    void startSourceIngest({
      action: "retry",
      sourceId,
    })
  })

  return {
    sources: list.sources,
    query: list.query,
    setQuery: list.setQuery,
    addOpen,
    setAddOpen,
    dragging: upload.dragging,
    setDragging: upload.setDragging,
    renameId: rename.renameId,
    setRenameId: rename.setRenameId,
    renameDraft: rename.renameDraft,
    setRenameDraft: rename.setRenameDraft,
    deleteId: sourceDelete.deleteId,
    setDeleteId: sourceDelete.setDeleteId,
    uploadNotice: upload.uploadNotice,
    uploading: list.uploading,
    listRef,
    scrollMemory,
    previewMarkdown,
    filtered: list.filtered,
    selectable: list.selectable,
    selectedCount: list.selectedCount,
    previewSource,
    uploadFiles: upload.uploadFiles,
    beginRename: rename.beginRename,
    saveRename: rename.saveRename,
    confirmDelete: sourceDelete.confirmDelete,
    handleSelect: selection.handleSelect,
    handleSelectMany: selection.handleSelectMany,
    handleRetry,
    handleDelete: sourceDelete.handleDelete,
  }
}
