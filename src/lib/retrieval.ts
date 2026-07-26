export type RetrievalCandidate = {
	chunkId: string
	sourceId: string
	text: string
	score: number
	channel: "vector" | "text" | "both"
	startOffset: number
	endOffset: number
	ordinal: number
}

export function mergeRetrievalCandidates(
	vectorHits: Array<Omit<RetrievalCandidate, "channel">>,
	textHits: Array<Omit<RetrievalCandidate, "channel">>,
) {
	const byId = new Map<string, RetrievalCandidate>()

	for (const hit of vectorHits) {
		byId.set(hit.chunkId, { ...hit, channel: "vector" })
	}

	for (const hit of textHits) {
		const existing = byId.get(hit.chunkId)

		if (!existing) {
			byId.set(hit.chunkId, { ...hit, channel: "text" })
			continue
		}

		byId.set(hit.chunkId, {
			...existing,
			score: Math.max(existing.score, hit.score),
			channel: "both",
		})
	}

	return [...byId.values()].sort((a, b) => b.score - a.score)
}

export function selectEvidenceWithinBudget(
	candidates: RetrievalCandidate[],
	maxCharacters: number,
) {
	const selected: RetrievalCandidate[] = []
	let used = 0

	for (const candidate of candidates) {
		const next = used + candidate.text.length

		if (selected.length && next > maxCharacters) {
			continue
		}

		selected.push(candidate)
		used = next

		if (used >= maxCharacters) {
			break
		}
	}

	return selected
}
