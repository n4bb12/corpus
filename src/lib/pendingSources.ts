import type { Id } from "src/convex/_generated/dataModel"
import type { UploadingSource } from "src/lib/uploadingSources"
import { useStore } from "zustand"
import { createStore } from "zustand/vanilla"

type NotebookPending = {
  uploading: UploadingSource[]
  creatingCount: number
  awaitingSourceIds: Id<"sources">[]
}

type PendingSourcesState = {
  byNotebook: Record<string, NotebookPending>
}

const EMPTY_UPLOADING: UploadingSource[] = []
const EMPTY_AWAITING: Id<"sources">[] = []

const EMPTY_NOTEBOOK: NotebookPending = {
  uploading: EMPTY_UPLOADING,
  creatingCount: 0,
  awaitingSourceIds: EMPTY_AWAITING,
}

const store = createStore<PendingSourcesState>(() => ({
  byNotebook: {},
}))

function notebookPending(notebookId: string) {
  return store.getState().byNotebook[notebookId] ?? EMPTY_NOTEBOOK
}

function setNotebookPending(notebookId: string, next: NotebookPending) {
  store.setState({
    byNotebook: {
      ...store.getState().byNotebook,
      [notebookId]: next,
    },
  })
}

export function updateUploadingSources(
  notebookId: Id<"notebooks">,
  updater: (current: UploadingSource[]) => UploadingSource[],
) {
  const key = notebookId
  const current = notebookPending(key)
  const uploading = updater(current.uploading)

  if (uploading === current.uploading) {
    return
  }

  setNotebookPending(key, {
    ...current,
    uploading,
  })
}

export function beginCreatingSource(notebookId: Id<"notebooks">) {
  const key = notebookId
  const current = notebookPending(key)

  setNotebookPending(key, {
    ...current,
    creatingCount: current.creatingCount + 1,
  })
}

export function completeCreatingSource(
  notebookId: Id<"notebooks">,
  sourceId: Id<"sources">,
) {
  const key = notebookId
  const current = notebookPending(key)

  setNotebookPending(key, {
    ...current,
    creatingCount: Math.max(0, current.creatingCount - 1),
    awaitingSourceIds: current.awaitingSourceIds.includes(sourceId)
      ? current.awaitingSourceIds
      : [...current.awaitingSourceIds, sourceId],
  })
}

export function failCreatingSource(notebookId: Id<"notebooks">) {
  const key = notebookId
  const current = notebookPending(key)

  setNotebookPending(key, {
    ...current,
    creatingCount: Math.max(0, current.creatingCount - 1),
  })
}

export function prunePendingSources(
  notebookId: Id<"notebooks">,
  sourceIds: Iterable<Id<"sources">>,
) {
  const key = notebookId
  const current = notebookPending(key)
  const ids = new Set(sourceIds)
  const awaitingSourceIds = current.awaitingSourceIds.filter(
    (sourceId) => !ids.has(sourceId),
  )

  if (awaitingSourceIds.length === current.awaitingSourceIds.length) {
    return
  }

  setNotebookPending(key, {
    ...current,
    awaitingSourceIds: awaitingSourceIds.length
      ? awaitingSourceIds
      : EMPTY_AWAITING,
  })
}

export function useUploadingSources(notebookId: Id<"notebooks">) {
  return useStore(
    store,
    (state) => state.byNotebook[notebookId]?.uploading ?? EMPTY_UPLOADING,
  )
}

export function useHasPendingSources(notebookId: Id<"notebooks">) {
  return useStore(store, (state) => {
    const pending = state.byNotebook[notebookId]

    if (!pending) {
      return false
    }

    return (
      !!pending.uploading.length ||
      pending.creatingCount > 0 ||
      !!pending.awaitingSourceIds.length
    )
  })
}
