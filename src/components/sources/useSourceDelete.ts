import { useMutation } from "convex/react"
import { useState } from "react"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { useEventCallback } from "src/lib/useEventCallback"

export function useSourceDelete() {
  const removeSource = useMutation(api.sources.remove)
  const [deleteId, setDeleteId] = useState<Id<"sources"> | null>(null)

  async function confirmDelete() {
    if (!deleteId) {
      return
    }

    await removeSource({ sourceId: deleteId })
    setDeleteId(null)
  }

  const handleDelete = useEventCallback((sourceId: Id<"sources">) => {
    setDeleteId(sourceId)
  })

  return {
    deleteId,
    setDeleteId,
    confirmDelete,
    handleDelete,
  }
}
