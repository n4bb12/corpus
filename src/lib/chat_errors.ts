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
					: "Generation failed."

	if (/insufficient_quota/i.test(raw)) {
		return "The AI provider is out of quota. Try again later."
	}

	if (/rate[_ ]?limit/i.test(raw)) {
		return "The AI provider is rate-limiting requests. Try again in a moment."
	}

	if (/context[_ ]?length|maximum context/i.test(raw)) {
		return "The question or sources are too large for one answer. Try a shorter question or fewer sources."
	}

	if (!raw.trim()) {
		return "Generation failed. Please try again."
	}

	if (raw.length > 220) {
		return "Generation failed. Please try again."
	}

	return raw
}
