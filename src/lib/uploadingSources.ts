import type { Doc, Id } from "src/convex/_generated/dataModel"

export type UploadingSource = {
  localId: string
  filename: string
  title: string
  addedAt: number
  sourceId?: Id<"sources">
}

export type SourcesListEntry =
  | { type: "uploading"; key: string; source: UploadingSource }
  | { type: "source"; key: string; source: Doc<"sources"> }

export type SourceListMatch = {
  _id: Id<"sources">
  createdAt: number
  title: string
}

/**
 * Newest first. Within a simultaneous batch, earlier accepted files get higher
 * timestamps so selection order stays stable as uploads complete.
 */
export function addedAtForBatch(
  index: number,
  batchSize: number,
  now = Date.now(),
) {
  return now + (batchSize - index)
}

function createdTitleKey(createdAt: number, title: string) {
  return `${createdAt}\0${title}`
}

/**
 * Map live source ids back to upload placeholder localIds, including the race
 * where Convex publishes the row before the client stamps `sourceId`.
 */
export function rowKeysForUploadingSources(
  uploading: UploadingSource[],
  sources: Iterable<SourceListMatch>,
) {
  const byId = new Map<string, string>()
  const byCreatedTitle = new Map<string, string>()

  for (const entry of uploading) {
    if (entry.sourceId) {
      byId.set(entry.sourceId, entry.localId)
      continue
    }

    byCreatedTitle.set(
      createdTitleKey(entry.addedAt, entry.title),
      entry.localId,
    )
  }

  const rowKeys: Record<string, string> = {}

  for (const source of sources) {
    const localId =
      byId.get(source._id) ??
      byCreatedTitle.get(createdTitleKey(source.createdAt, source.title))

    if (localId) {
      rowKeys[source._id] = localId
    }
  }

  return rowKeys
}

export function visibleUploadingSources(
  uploading: UploadingSource[],
  sources: Iterable<SourceListMatch>,
) {
  const ids = new Set<string>()
  const createdTitles = new Set<string>()

  for (const source of sources) {
    ids.add(source._id)
    createdTitles.add(createdTitleKey(source.createdAt, source.title))
  }

  return uploading.filter((entry) => {
    if (entry.sourceId) {
      return !ids.has(entry.sourceId)
    }

    // Convex may publish before we stamp sourceId on the placeholder.
    return !createdTitles.has(createdTitleKey(entry.addedAt, entry.title))
  })
}

export function markUploadingSourceCreated(
  uploading: UploadingSource[],
  localId: string,
  sourceId: Id<"sources">,
) {
  return uploading.map((entry) =>
    entry.localId === localId ? { ...entry, sourceId } : entry,
  )
}

export function removeUploadingSource(
  uploading: UploadingSource[],
  localId: string,
) {
  return uploading.filter((entry) => entry.localId !== localId)
}

function sortAt(entry: SourcesListEntry) {
  return entry.type === "uploading"
    ? entry.source.addedAt
    : entry.source.createdAt
}

const EMPTY_ROW_KEYS: Record<string, string> = {}

/**
 * Prefer the upload placeholder's localId as the React key so the row (and its
 * spinner) survives the handoff into the live source document.
 */
export function mergeSourcesListEntries(
  uploading: UploadingSource[],
  sources: Doc<"sources">[],
  rowKeyBySourceId: Record<string, string> = EMPTY_ROW_KEYS,
): SourcesListEntry[] {
  return [
    ...uploading.map(
      (source): SourcesListEntry => ({
        type: "uploading",
        key: source.localId,
        source,
      }),
    ),
    ...sources.map(
      (source): SourcesListEntry => ({
        type: "source",
        key: rowKeyBySourceId[source._id] ?? source._id,
        source,
      }),
    ),
  ].sort((a, b) => {
    const delta = sortAt(b) - sortAt(a)

    if (delta !== 0) {
      return delta
    }

    return a.source.title.localeCompare(b.source.title)
  })
}
