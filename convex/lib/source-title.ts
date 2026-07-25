export function normalizeTitle(raw: string, fallback: string) {
	const collapsed = raw.replace(/\s+/g, " ").trim()

	if (!collapsed) {
		return fallback
	}

	if (collapsed.length <= 100) {
		return collapsed
	}

	return collapsed.slice(0, 100).trimEnd()
}

export function titleFromPastedText(text: string) {
	const line = text
		.split(/\r?\n/)
		.map((entry) => entry.trim())
		.find(Boolean)

	return normalizeTitle(line ?? "", "Pasted text")
}

export function titleFromUrl(url: string, htmlTitle?: string | null) {
	if (htmlTitle) {
		return normalizeTitle(htmlTitle, url)
	}

	try {
		const parsed = new URL(url)
		const path = parsed.pathname === "/" ? "" : parsed.pathname
		return normalizeTitle(`${parsed.hostname}${path}`, url)
	} catch {
		return normalizeTitle(url, "URL source")
	}
}

export function titleFromFilename(filename: string) {
	return normalizeTitle(filename, "Uploaded file")
}
