import type { OptimisticLocalStore } from "convex/browser"
import { api } from "src/convex/_generated/api"
import type { Doc, Id } from "src/convex/_generated/dataModel"
import { patchChatEntriesForSourceSelection } from "src/lib/optimisticSourceBoundary"

export function patchSourceSelected(
  sources: Doc<"sources">[],
  sourceId: Id<"sources">,
  selected: boolean,
) {
  return sources.map((source) =>
    source._id === sourceId ? { ...source, selected } : source,
  )
}

export function patchSourcesSelectedMany(
  sources: Doc<"sources">[],
  sourceIds: Id<"sources">[],
  selected: boolean,
) {
  const idSet = new Set(sourceIds)

  return sources.map((source) => {
    if (!idSet.has(source._id) || source.processingState === "failed") {
      return source
    }

    return source.selected === selected ? source : { ...source, selected }
  })
}

export function syncOptimisticChatBoundary(
  localStore: OptimisticLocalStore,
  notebookId: Id<"notebooks">,
  previousSources: Doc<"sources">[],
  nextSources: Doc<"sources">[],
) {
  const notebook = localStore.getQuery(api.notebooks.get, { notebookId })
  const entries = localStore.getQuery(api.chat.list, { notebookId })

  if (!notebook || !entries) {
    return
  }

  localStore.setQuery(
    api.chat.list,
    { notebookId },
    patchChatEntriesForSourceSelection({
      entries,
      previousSources,
      nextSources,
      chatSelectionHash: notebook.chatSelectionHash,
      notebookId,
      chatEpoch: notebook.chatEpoch,
    }),
  )
}
