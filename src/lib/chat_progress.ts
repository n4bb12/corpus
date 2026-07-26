export const CHAT_PROGRESS = {
	looking: "Looking through your sources…",
	searching: "Searching for relevant passages…",
	ranking: "Picking the best matches…",
	writing: "Writing an answer…",
} as const

export type ChatProgressLabel =
	(typeof CHAT_PROGRESS)[keyof typeof CHAT_PROGRESS]
