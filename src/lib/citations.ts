export type CitationRef = {
	chunkId: string
	excerpt?: string
}

const CITATION_PATTERN = /\[\[cite:([^\]]+)\]\]/g
const NUMBERED_CITATION_PATTERN = /\[\[cite:(\d+)\]\]/g

export function parseCitationMarkers(text: string) {
	const refs: CitationRef[] = []
	const cleaned = text.replace(CITATION_PATTERN, (_match, rawIds: string) => {
		const ids = rawIds
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean)

		const markers: string[] = []

		for (const chunkId of ids) {
			let order = refs.findIndex((ref) => ref.chunkId === chunkId)

			if (order < 0) {
				refs.push({ chunkId })
				order = refs.length - 1
			}

			markers.push(`[[cite:${order + 1}]]`)
		}

		return markers.join(" ")
	})

	return {
		text: cleaned
			.replace(/[ \t]+\n/g, "\n")
			.replace(/ {2,}/g, " ")
			.replace(/\n{3,}/g, "\n\n")
			.trim(),
		citations: refs,
	}
}

export function stripCitationMarkers(text: string) {
	return text
		.replace(CITATION_PATTERN, "")
		.replace(/\n{3,}/g, "\n\n")
		.replace(/[ \t]+\n/g, "\n")
		.trim()
}

export function remapCitationMarkers(
	text: string,
	citations: CitationRef[],
	valid: CitationRef[],
) {
	const validIds = new Set(valid.map((citation) => citation.chunkId))
	const oldToNew = new Map<number, number>()
	let next = 1

	citations.forEach((citation, index) => {
		if (validIds.has(citation.chunkId)) {
			oldToNew.set(index + 1, next)
			next += 1
		}
	})

	return text
		.replace(NUMBERED_CITATION_PATTERN, (_match, rawIndex: string) => {
			const mapped = oldToNew.get(Number(rawIndex))

			return mapped ? ` [[cite:${mapped}]]` : ""
		})
		.replace(/[ \t]+\n/g, "\n")
		.replace(/ +/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
}

export function splitCitedParagraphs(markdown: string) {
	const paragraphs = markdown.split(/\n\n+/)

	return paragraphs
		.map((paragraph) => {
			const citationIndexes: number[] = []
			const text = paragraph
				.replace(NUMBERED_CITATION_PATTERN, (_match, rawIndex: string) => {
					const index = Number(rawIndex)

					if (Number.isFinite(index) && index > 0) {
						citationIndexes.push(index)
					}

					return ""
				})
				.replace(/[ \t]+$/gm, "")
				.trim()

			return { text, citationIndexes }
		})
		.filter((paragraph) => paragraph.text || paragraph.citationIndexes.length)
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

			const chunkId = orderedChunkIds[cursor % orderedChunkIds.length]

			if (typeof chunkId !== "string") {
				return paragraph
			}

			cursor += 1
			return `${paragraph} [[cite:${chunkId}]]`
		})
		.join("\n\n")
}
