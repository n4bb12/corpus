export function formatChatError(error: unknown) {
	const raw =
		typeof error === "string"
			? error
			: error instanceof Error
				? error.message
				: error &&
						typeof error === "object" &&
						"message" in error &&
						typeof error.message === "string"
					? error.message
					: "Couldn't generate an answer."

	if (/insufficient_quota/i.test(raw)) {
		return "Chat is temporarily unavailable. Try again later."
	}

	if (/rate[_ ]?limit/i.test(raw)) {
		return "Too many requests right now. Try again in a moment."
	}

	if (/context[_ ]?length|maximum context/i.test(raw)) {
		return "The question or sources are too large for one answer. Try a shorter question or fewer sources."
	}

	if (!raw.trim()) {
		return "Couldn't generate an answer. Try again."
	}

	if (raw.length > 220) {
		return "Couldn't generate an answer. Try again."
	}

	return raw
}
