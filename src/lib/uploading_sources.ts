import type { Id } from "src/convex/_generated/dataModel"

export type UploadingSource = {
	localId: string
	filename: string
	title: string
	sourceId?: Id<"sources">
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
