import { useMutation } from "convex/react"
import { useState } from "react"
import { api } from "src/convex/_generated/api"
import type { Doc, Id } from "src/convex/_generated/dataModel"
import { useEventCallback } from "src/lib/useEventCallback"

export function useSourceRename() {
  const renameSource = useMutation(api.sources.rename)
  const [renameId, setRenameId] = useState<Id<"sources"> | null>(null)
  const [renameDraft, setRenameDraft] = useState("")

  const beginRename = useEventCallback((source: Doc<"sources">) => {
    setRenameId(source._id)
    setRenameDraft(source.title)
  })

  async function saveRename() {
    if (!renameId) {
      return
    }

    await renameSource({ sourceId: renameId, title: renameDraft })
    setRenameId(null)
  }

  return {
    renameId,
    setRenameId,
    renameDraft,
    setRenameDraft,
    beginRename,
    saveRename,
  }
}
