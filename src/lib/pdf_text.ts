const PAGE_MARKER_PATTERN = /(?:^|\n)\s*--\s*\d+\s+of\s+\d+\s*--\s*(?=\n|$)/g

export function cleanPdfText(text: string) {
	return text
		.replace(PAGE_MARKER_PATTERN, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
}

export function isUsefulPdfText(text: string) {
	const cleaned = cleanPdfText(text)

	if (cleaned.length < 40) {
		return false
	}

	return /[A-Za-zÀ-ÿ]{3,}/.test(cleaned)
}
