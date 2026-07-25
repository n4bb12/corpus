export type ChunkLocator = {
	ordinal: number
	startOffset: number
	endOffset: number
}

export function deriveChunkLocators(chunks: string[], fullText: string) {
	const locators: ChunkLocator[] = []
	let searchFrom = 0

	chunks.forEach((chunk, ordinal) => {
		const index = fullText.indexOf(chunk, searchFrom)
		const startOffset = index >= 0 ? index : searchFrom
		const endOffset = startOffset + chunk.length

		locators.push({
			ordinal,
			startOffset,
			endOffset,
		})

		searchFrom = endOffset
	})

	return locators
}
