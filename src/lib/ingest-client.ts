import type { Id } from "src/convex/_generated/dataModel"

export type IngestCreateUrlInput = {
	action: "create"
	kind: "url"
	notebookId: Id<"notebooks">
	url: string
}

export type IngestCreateTextInput = {
	action: "create"
	kind: "text"
	notebookId: Id<"notebooks">
	text: string
}

export type IngestCreateFileInput = {
	action: "create"
	kind: "file"
	notebookId: Id<"notebooks">
	storageId: Id<"_storage">
	filename: string
	mimeType?: string
}

export type IngestRetryInput = {
	action: "retry"
	sourceId: Id<"sources">
}

export type IngestStartInput =
	| IngestCreateUrlInput
	| IngestCreateTextInput
	| IngestCreateFileInput
	| IngestRetryInput

async function postIngest(body: unknown) {
	const response = await fetch("/api/sources/ingest", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	})

	const payload = (await response.json().catch(() => null)) as {
		sourceId?: string
		error?: string
		ok?: boolean
	} | null

	if (!response.ok) {
		throw new Error(payload?.error || "Could not start source ingestion.")
	}

	return payload
}

function kickProcess(sourceId: string) {
	void fetch("/api/sources/ingest", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "process", sourceId }),
	}).catch(() => {
		// Processing failures are persisted via Convex `processingState`.
	})
}

/** Awaits source creation/retry only; processing continues in the background. */
export async function startSourceIngest(input: IngestStartInput) {
	const payload = await postIngest(input)
	const sourceId = input.action === "retry" ? input.sourceId : payload?.sourceId

	if (!sourceId) {
		throw new Error("Source ingestion did not return an id.")
	}

	kickProcess(sourceId)
	return sourceId as Id<"sources">
}
