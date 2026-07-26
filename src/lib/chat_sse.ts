export type ChatSseResult = {
	done: boolean
	error: string | null
	text: string
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
	onText?: (text: string) => void,
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
					event === "text" &&
					data &&
					typeof data === "object" &&
					"delta" in data &&
					typeof data.delta === "string"
				) {
					text += data.delta
					onText?.(text)
				}
			},
		)
	}

	return { done, error, text }
}
