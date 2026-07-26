import {
	parseCitationMarkers,
	remapCitationMarkers,
	validateCitations,
} from "src/lib/citations"

export type ChatSseResult = {
	done: boolean
	error: string | null
	text: string
}

export type StreamCitation = {
	_id: string
	chunkId: string
	sourceId?: string
	liveTitle: string
	excerpt: string
	canNavigate: boolean
	locator?: { startOffset?: number; endOffset?: number } | null
}

export type ChatSseHandlers = {
	onText?: (text: string) => void
	onCitations?: (citations: StreamCitation[]) => void
}

function isStreamCitation(value: unknown): value is StreamCitation {
	return (
		!!value &&
		typeof value === "object" &&
		"_id" in value &&
		typeof value._id === "string" &&
		"chunkId" in value &&
		typeof value.chunkId === "string" &&
		"liveTitle" in value &&
		typeof value.liveTitle === "string" &&
		"excerpt" in value &&
		typeof value.excerpt === "string" &&
		"canNavigate" in value &&
		typeof value.canNavigate === "boolean"
	)
}

export function resolveStreamedAssistantContent(
	text: string,
	catalog: StreamCitation[],
) {
	const parsed = parseCitationMarkers(text)
	const byChunkId = new Map(
		catalog.map((citation) => [citation.chunkId, citation]),
	)
	const validation = validateCitations(
		parsed.citations,
		new Set(byChunkId.keys()),
	)
	const citations = validation.valid.flatMap((reference) => {
		const citation = byChunkId.get(reference.chunkId)

		return citation ? [citation] : []
	})

	return {
		content: remapCitationMarkers(
			parsed.text,
			parsed.citations,
			validation.valid,
		),
		citations,
	}
}

export function parseSseChunk(
	buffer: string,
	onEvent: (event: string, data: unknown) => void,
) {
	const parts = buffer.split("\n\n")
	const rest = parts.pop() ?? ""

	for (const part of parts) {
		let event = "message"
		const dataLines: string[] = []

		for (const line of part.split("\n")) {
			if (line.startsWith("event:")) {
				event = line.slice(6).trim()
				continue
			}

			if (line.startsWith("data:")) {
				dataLines.push(line.slice(5).trim())
			}
		}

		if (!dataLines.length) {
			continue
		}

		const raw = dataLines.join("\n")

		try {
			onEvent(event, JSON.parse(raw))
		} catch {
			onEvent(event, raw)
		}
	}

	return rest
}

export async function consumeChatSse(
	response: Response,
	handlers: ChatSseHandlers = {},
): Promise<ChatSseResult> {
	const reader = response.body?.getReader()

	if (!reader) {
		return {
			done: false,
			error: "Chat response was empty.",
			text: "",
		}
	}

	const decoder = new TextDecoder()
	let buffer = ""
	let done = false
	let error: string | null = null
	let text = ""

	while (true) {
		const { done: streamDone, value } = await reader.read()

		if (streamDone) {
			break
		}

		buffer = parseSseChunk(
			buffer + decoder.decode(value, { stream: true }),
			(event, data) => {
				if (event === "done") {
					done = true
					return
				}

				if (event === "error") {
					const message =
						data &&
						typeof data === "object" &&
						"message" in data &&
						typeof data.message === "string"
							? data.message
							: "Generation failed."
					error = message
					return
				}

				if (
					event === "citations" &&
					data &&
					typeof data === "object" &&
					"citations" in data &&
					Array.isArray(data.citations)
				) {
					handlers.onCitations?.(data.citations.filter(isStreamCitation))
					return
				}

				if (
					event === "text" &&
					data &&
					typeof data === "object" &&
					"delta" in data &&
					typeof data.delta === "string"
				) {
					text += data.delta
					handlers.onText?.(text)
				}
			},
		)
	}

	return { done, error, text }
}
