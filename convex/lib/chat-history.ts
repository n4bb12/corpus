export type ChatEntryLike = {
	kind: "message" | "sourceBoundary"
	role?: "user" | "assistant"
	status?: "pending" | "streaming" | "complete" | "failed" | "canceled"
	exchangeId?: string
	content?: string
	createdAt: number
}

export function latestBoundaryIndex(entries: ChatEntryLike[]) {
	for (let index = entries.length - 1; index >= 0; index -= 1) {
		if (entries[index]?.kind === "sourceBoundary") {
			return index
		}
	}

	return -1
}

export function successfulPairsAfterBoundary(
	entries: ChatEntryLike[],
	maxPairs: number,
) {
	const boundary = latestBoundaryIndex(entries)
	const window = entries.slice(boundary + 1)
	const pairs: Array<{ user: ChatEntryLike; assistant: ChatEntryLike }> = []
	const byExchange = new Map<
		string,
		{ user?: ChatEntryLike; assistant?: ChatEntryLike }
	>()

	for (const entry of window) {
		if (entry.kind !== "message" || !entry.exchangeId) {
			continue
		}

		const bucket = byExchange.get(entry.exchangeId) ?? {}

		if (entry.role === "user") {
			bucket.user = entry
		}

		if (entry.role === "assistant" && entry.status === "complete") {
			bucket.assistant = entry
		}

		byExchange.set(entry.exchangeId, bucket)
	}

	for (const entry of window) {
		if (
			entry.kind !== "message" ||
			entry.role !== "assistant" ||
			!entry.exchangeId
		) {
			continue
		}

		const bucket = byExchange.get(entry.exchangeId)

		if (!bucket?.user || !bucket.assistant) {
			continue
		}

		if (pairs.some((pair) => pair.assistant.exchangeId === entry.exchangeId)) {
			continue
		}

		pairs.push({ user: bucket.user, assistant: bucket.assistant })
	}

	return pairs.slice(-maxPairs)
}

export function canRetryLatestAssistant(entries: ChatEntryLike[]) {
	const messages = entries.filter((entry) => entry.kind === "message")
	const latest = messages.at(-1)

	if (!latest || latest.role !== "assistant") {
		return false
	}

	return latest.status === "failed" || latest.status === "canceled"
}

export type SourceRevisionEvent = {
	selectedReadySourceIds: string[]
	revision: number
}

export function shouldCreateSourceRevision(
	previousIds: string[],
	nextIds: string[],
) {
	if (previousIds.length !== nextIds.length) {
		return true
	}

	const previous = [...previousIds].sort()
	const next = [...nextIds].sort()

	return previous.some((id, index) => id !== next[index])
}
