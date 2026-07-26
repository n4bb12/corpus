import { extractPdfMarkdown } from "src/server/sources/pdf"

async function getConverter() {
	const { ensureDomMatrix } = await import("src/server/polyfills/dommatrix")

	ensureDomMatrix()

	const { MarkItDown } = await import("markitdown-ts")

	return new MarkItDown()
}

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

	const converter = await getConverter()
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
