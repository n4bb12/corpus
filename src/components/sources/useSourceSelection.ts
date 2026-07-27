import { useMutation } from "convex/react"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import {
  patchSourceSelected,
  patchSourcesSelectedMany,
  syncOptimisticChatBoundary,
} from "src/lib/optimisticSourceSelection"
import { useEventCallback } from "src/lib/useEventCallback"

export function useSourceSelection() {
  const setSelected = useMutation(api.sources.setSelected).withOptimisticUpdate(
    (localStore, args) => {
      for (const { args: queryArgs, value } of localStore.getAllQueries(
        api.sources.listByNotebook,
      )) {
        if (!value) {
          continue
        }

        const source = value.find((entry) => entry._id === args.sourceId)

        if (!source) {
          continue
        }

        const nextSources = patchSourceSelected(
          value,
          args.sourceId,
          args.selected,
        )

        localStore.setQuery(api.sources.listByNotebook, queryArgs, nextSources)

        if (source.processingState !== "ready") {
          continue
        }

        syncOptimisticChatBoundary(
          localStore,
          source.notebookId,
          value,
          nextSources,
        )
      }
    },
  )
  const setSelectedMany = useMutation(
    api.sources.setSelectedMany,
  ).withOptimisticUpdate((localStore, args) => {
    for (const { args: queryArgs, value } of localStore.getAllQueries(
      api.sources.listByNotebook,
    )) {
      if (!value || queryArgs.notebookId !== args.notebookId) {
        continue
      }

      const nextSources = patchSourcesSelectedMany(
        value,
        args.sourceIds,
        args.selected,
      )

      localStore.setQuery(api.sources.listByNotebook, queryArgs, nextSources)
      syncOptimisticChatBoundary(
        localStore,
        args.notebookId,
        value,
        nextSources,
      )
    }
  })

  const handleSelect = useEventCallback(
    (sourceId: Id<"sources">, selected: boolean) => {
      void setSelected({ sourceId, selected })
    },
  )
  const handleSelectMany = useEventCallback(
    (args: {
      notebookId: Id<"notebooks">
      sourceIds: Id<"sources">[]
      selected: boolean
    }) => {
      void setSelectedMany(args)
    },
  )

  return {
    handleSelect,
    handleSelectMany,
  }
}
