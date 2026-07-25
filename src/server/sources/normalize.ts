import { MarkItDown } from "markitdown-ts"

const converter = new MarkItDown()

export async function normalizeBufferToMarkdown(
	buffer: Buffer,
	fileExtension: string,
) {
	const result = await converter.convertBuffer(buffer, {
		file_extension: fileExtension.startsWith(".")
			? fileExtension
			: `.${fileExtension}`,
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
