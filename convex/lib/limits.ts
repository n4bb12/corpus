export const LIMITS = {
	notebooksPerAccount: 100,
	sourcesPerNotebook: 20,
	ingestionsPerDay: 50,
	generationsPerDay: 100,
	maxUploadBytes: 20 * 1024 * 1024,
	maxUrlResponseBytes: 2 * 1024 * 1024,
	maxPastedCharacters: 200_000,
	maxExtractedCharacters: 500_000,
	maxPromptCharacters: 4_000,
	maxTitleCharacters: 100,
	libraryPageSize: 12,
	chatHistoryPairs: 10,
	embeddingDimensions: 1_024,
} as const

export const MODELS = {
	chat: "gpt-5.4-mini",
	title: "gpt-5.4-nano",
	embed: "voyage-4-large",
	rerank: "rerank-2.5",
} as const

export const UNTITLED_NOTEBOOK = "Untitled notebook"
