import { useQuery } from "convex-helpers/react/cache"
import { useEffect, useMemo, useState } from "react"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import {
  prunePendingSources,
  updateUploadingSources,
  useUploadingSources,
} from "src/lib/pendingSources"
import { visibleUploadingSources } from "src/lib/uploadingSources"
import { useSignedInQueryArgs } from "src/lib/useSignedIn"

export function useSourcesList(notebookId: Id<"notebooks">) {
  const sources = useQuery(
    api.sources.listByNotebook,
    useSignedInQueryArgs({ notebookId }),
  )
  const [query, setQuery] = useState("")
  const uploadingSources = useUploadingSources(notebookId)

  const filtered = useMemo(() => {
    const list = sources ?? []
    const showSearch = list.length >= 6
    const needle = showSearch ? query.trim().toLowerCase() : ""

    if (!needle) {
      return list
    }

    return list.filter((source) => source.title.toLowerCase().includes(needle))
  }, [query, sources])

  const uploading = useMemo(
    () =>
      visibleUploadingSources(
        uploadingSources,
        (sources ?? []).map((source) => source._id),
      ),
    [sources, uploadingSources],
  )

  useEffect(() => {
    if (!sources) {
      return
    }

    const sourceIds = new Set(sources.map((source) => source._id))

    prunePendingSources(notebookId, sourceIds)

    updateUploadingSources(notebookId, (current) => {
      const next = visibleUploadingSources(current, sourceIds)

      return next.length === current.length ? current : next
    })
  }, [notebookId, sources])

  const selectable = useMemo(
    () => filtered.filter((source) => source.processingState !== "failed"),
    [filtered],
  )
  const selectedCount = useMemo(
    () => selectable.filter((source) => source.selected).length,
    [selectable],
  )

  return {
    sources,
    query,
    setQuery,
    uploading,
    uploadingCount: uploadingSources.length,
    filtered,
    selectable,
    selectedCount,
  }
}
