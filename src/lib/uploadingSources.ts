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

export function visibleUploadingSources(
  uploading: UploadingSource[],
  sourceIds: Iterable<Id<"sources">>,
) {
  const ids = new Set(sourceIds)

  return uploading.filter(
    (entry) => !entry.sourceId || !ids.has(entry.sourceId),
  )
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
