import { useQuery } from "convex-helpers/react/cache"
import { useEffect, useMemo, useState } from "react"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import {
  prunePendingSources,
  rememberSourceRowKey,
  updateUploadingSources,
  useSourceRowKeys,
  useUploadingSources,
} from "src/lib/pendingSources"
import {
  markUploadingSourceCreated,
  rowKeysForUploadingSources,
  visibleUploadingSources,
} from "src/lib/uploadingSources"
import { useSignedInQueryArgs } from "src/lib/useSignedIn"

export function useSourcesList(notebookId: Id<"notebooks">) {
  const sources = useQuery(
    api.sources.listByNotebook,
    useSignedInQueryArgs({ notebookId }),
  )
  const [query, setQuery] = useState("")
  const uploadingSources = useUploadingSources(notebookId)
  const rememberedRowKeys = useSourceRowKeys(notebookId)

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
    () => visibleUploadingSources(uploadingSources, sources ?? []),
    [sources, uploadingSources],
  )
  const rowKeyBySourceId = useMemo(
    () => ({
      ...rowKeysForUploadingSources(uploadingSources, sources ?? []),
      ...rememberedRowKeys,
    }),
    [rememberedRowKeys, sources, uploadingSources],
  )

  useEffect(() => {
    if (!sources) {
      return
    }

    const sourceIds = new Set(sources.map((source) => source._id))

    prunePendingSources(notebookId, sourceIds)

    updateUploadingSources(notebookId, (current) => {
      let next = current

      for (const entry of current) {
        if (entry.sourceId) {
          continue
        }

        const match = sources.find(
          (source) =>
            source.createdAt === entry.addedAt && source.title === entry.title,
        )

        if (!match) {
          continue
        }

        rememberSourceRowKey(notebookId, match._id, entry.localId)
        next = markUploadingSourceCreated(next, entry.localId, match._id)
      }

      const pruned = next.filter(
        (entry) => !entry.sourceId || !sourceIds.has(entry.sourceId),
      )

      return pruned.length === current.length && next === current
        ? current
        : pruned
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
    rowKeyBySourceId,
    filtered,
    selectable,
    selectedCount,
  }
}
