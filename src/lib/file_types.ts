export const ACCEPTED_EXTENSIONS = [
	".pdf",
	".docx",
	".xlsx",
	".html",
	".htm",
	".txt",
	".md",
	".markdown",
	".csv",
	".xml",
	".rss",
	".atom",
	".ipynb",
] as const

export const REJECTED_EXTENSIONS = [
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".svg",
	".mp3",
	".wav",
	".m4a",
	".zip",
	".ppt",
	".pptx",
] as const

const MIME_BY_EXTENSION: Record<string, string[]> = {
	".pdf": ["application/pdf"],
	".docx": [
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	],
	".xlsx": [
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	],
	".html": ["text/html"],
	".htm": ["text/html"],
	".txt": ["text/plain"],
	".md": ["text/markdown", "text/plain"],
	".markdown": ["text/markdown", "text/plain"],
	".csv": ["text/csv", "text/plain"],
	".xml": ["application/xml", "text/xml"],
	".rss": ["application/rss+xml", "application/xml", "text/xml"],
	".atom": ["application/atom+xml", "application/xml", "text/xml"],
	".ipynb": ["application/json", "text/plain"],
}

export function getFileExtension(filename: string) {
	const index = filename.lastIndexOf(".")

	if (index < 0) {
		return ""
	}

	return filename.slice(index).toLowerCase()
}

export function isAcceptedUpload(filename: string, mimeType?: string) {
	const extension = getFileExtension(filename)

	if (
		!ACCEPTED_EXTENSIONS.includes(
			extension as (typeof ACCEPTED_EXTENSIONS)[number],
		)
	) {
		return false
	}

	if (!mimeType || mimeType === "application/octet-stream") {
		return true
	}

	const allowed = MIME_BY_EXTENSION[extension] ?? []
	return allowed.includes(mimeType)
}

export function describeRejectedFile(filename: string) {
	const extension = getFileExtension(filename)

	if (
		REJECTED_EXTENSIONS.includes(
			extension as (typeof REJECTED_EXTENSIONS)[number],
		)
	) {
		return `${filename} uses an unsupported type.`
	}

	return `${filename} is not an accepted source format.`
}
