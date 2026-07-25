export type CitationRef = {
	chunkId: string
	excerpt?: string
}

const CITATION_PATTERN = /\[\[cite:([^\]]+)\]\]/g

export function parseCitationMarkers(text: string) {
	const refs: CitationRef[] = []
	const cleaned = text.replace(CITATION_PATTERN, (_match, rawIds: string) => {
		const ids = rawIds
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean)

		for (const chunkId of ids) {
			if (!refs.some((ref) => ref.chunkId === chunkId)) {
				refs.push({ chunkId })
			}
		}

		return ""
	})

	return {
		text: cleaned.replace(/\n{3,}/g, "\n\n").trim(),
		citations: refs,
	}
}

export function validateCitations(
	citations: CitationRef[],
	allowedChunkIds: Set<string>,
) {
	const valid = citations.filter((citation) =>
		allowedChunkIds.has(citation.chunkId),
	)
	const invalid = citations.filter(
		(citation) => !allowedChunkIds.has(citation.chunkId),
	)

	return { valid, invalid }
}

export function attachParagraphCitations(
	markdown: string,
	orderedChunkIds: string[],
) {
	if (!orderedChunkIds.length) {
		return markdown
	}

	const paragraphs = markdown.split(/\n\n+/)
	let cursor = 0

	return paragraphs
		.map((paragraph) => {
			const trimmed = paragraph.trim()

			if (!trimmed) {
				return paragraph
			}

			if (/^(#{1,6}\s|>|[-*]\s|\d+\.\s)/.test(trimmed)) {
				return paragraph
			}

			if (trimmed.length < 40) {
				return paragraph
			}

			const chunkId = orderedChunkIds[cursor % orderedChunkIds.length]!
			cursor += 1
			return `${paragraph} [[cite:${chunkId}]]`
		})
		.join("\n\n")
}
