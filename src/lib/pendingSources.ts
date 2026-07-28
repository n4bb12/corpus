import type { Id } from "src/convex/_generated/dataModel"
import type { UploadingSource } from "src/lib/uploadingSources"
import { useStore } from "zustand"
import { createStore } from "zustand/vanilla"

type NotebookPending = {
  uploading: UploadingSource[]
  rowKeyBySourceId: Record<string, string>
}

type PendingSourcesState = {
  byNotebook: Record<string, NotebookPending>
}

const EMPTY_UPLOADING: UploadingSource[] = []
const EMPTY_ROW_KEYS: Record<string, string> = {}

const EMPTY_NOTEBOOK: NotebookPending = {
  uploading: EMPTY_UPLOADING,
  rowKeyBySourceId: EMPTY_ROW_KEYS,
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

export function rememberSourceRowKey(
  notebookId: Id<"notebooks">,
  sourceId: Id<"sources">,
  localId: string,
) {
  const key = notebookId
  const current = notebookPending(key)

  if (current.rowKeyBySourceId[sourceId] === localId) {
    return
  }

  setNotebookPending(key, {
    ...current,
    rowKeyBySourceId: {
      ...current.rowKeyBySourceId,
      [sourceId]: localId,
    },
  })
}

export function prunePendingSources(
  notebookId: Id<"notebooks">,
  sourceIds: Iterable<Id<"sources">>,
) {
  const key = notebookId
  const current = notebookPending(key)
  const ids = new Set<string>(sourceIds)
  const rowKeyBySourceId = Object.fromEntries(
    Object.entries(current.rowKeyBySourceId).filter(([sourceId]) =>
      ids.has(sourceId),
    ),
  )

  if (
    Object.keys(rowKeyBySourceId).length ===
    Object.keys(current.rowKeyBySourceId).length
  ) {
    return
  }

  setNotebookPending(key, {
    ...current,
    rowKeyBySourceId: Object.keys(rowKeyBySourceId).length
      ? rowKeyBySourceId
      : EMPTY_ROW_KEYS,
  })
}

export function useUploadingSources(notebookId: Id<"notebooks">) {
  return useStore(
    store,
    (state) => state.byNotebook[notebookId]?.uploading ?? EMPTY_UPLOADING,
  )
}

export function useSourceRowKeys(notebookId: Id<"notebooks">) {
  return useStore(
    store,
    (state) => state.byNotebook[notebookId]?.rowKeyBySourceId ?? EMPTY_ROW_KEYS,
  )
}

export function useHasPendingSources(notebookId: Id<"notebooks">) {
  return useStore(
    store,
    (state) => !!state.byNotebook[notebookId]?.uploading.length,
  )
}
