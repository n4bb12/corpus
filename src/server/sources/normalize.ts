import { MarkItDown } from "markitdown-ts"
import { extractPdfMarkdown } from "src/server/sources/pdf"

const converter = new MarkItDown()

export async function normalizeBufferToMarkdown(
	buffer: Buffer,
	fileExtension: string,
) {
	const extension = fileExtension.startsWith(".")
		? fileExtension.toLowerCase()
		: `.${fileExtension.toLowerCase()}`

	if (extension === ".pdf") {
		return extractPdfMarkdown(buffer)
	}

	const result = await converter.convertBuffer(buffer, {
		file_extension: extension,
	})

	return {
		title: result?.title ?? null,
		markdown: result?.markdown?.trim() ?? "",
	}
}

export async function normalizeHtmlToMarkdown(html: string) {
	return normalizeBufferToMarkdown(
		Buffer.from(`<html><body>${html}</body></html>`),
		".html",
	)
}
