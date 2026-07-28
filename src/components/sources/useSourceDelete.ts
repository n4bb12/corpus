import { useState } from "react"
import type { Id } from "src/convex/_generated/dataModel"
import { useEventCallback } from "src/lib/useEventCallback"

export function useSourceDelete() {
  const [deleteId, setDeleteId] = useState<Id<"sources"> | null>(null)

  async function confirmDelete() {
    if (!deleteId) {
      return
    }

    const response = await fetch("/api/sources/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId: deleteId }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      throw new Error(payload?.error || "Couldn't delete this source.")
    }

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
