import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { requireEnv } from "src/lib/env"
import { LIMITS, MODELS } from "src/lib/limits"
import { cleanPdfText, isUsefulPdfText } from "src/lib/pdf_text"

async function loadPdfParse() {
	const { ensureDomMatrix } = await import("src/server/polyfills/dommatrix")

	ensureDomMatrix()

	const { PDFParse } = await import("pdf-parse")

	return PDFParse
}

async function extractPdfTextLayer(buffer: Buffer) {
	const PDFParse = await loadPdfParse()
	const parser = new PDFParse({ data: buffer })

	try {
		const result = await parser.getText()

		return cleanPdfText(result.text ?? "")
	} finally {
		await parser.destroy()
	}
}

async function extractPdfViaVision(buffer: Buffer) {
	const PDFParse = await loadPdfParse()
	const parser = new PDFParse({ data: buffer })

	try {
		const shot = await parser.getScreenshot({
			scale: 2,
		})
		const openai = createOpenAI({
			apiKey: requireEnv("OPENAI_API_KEY"),
		})
		const pages: string[] = []

		for (const page of (shot.pages ?? []).slice(0, LIMITS.maxPdfOcrPages)) {
			const result = await generateText({
				model: openai(MODELS.chat),
				messages: [
					{
						role: "user",
						content: [
							{
								type: "text",
								text: "Extract all readable text from this document page as clean markdown. Preserve headings, lists, and paragraphs. Do not invent content. Return only the extracted text.",
							},
							{
								type: "file",
								mediaType: "image/png",
								data: Buffer.from(page.data),
							},
						],
					},
				],
			})

			const pageText = result.text.trim()

			if (pageText) {
				pages.push(pageText)
			}
		}

		return pages.join("\n\n").trim()
	} finally {
		await parser.destroy()
	}
}

export async function extractPdfMarkdown(buffer: Buffer) {
	const layered = await extractPdfTextLayer(buffer)

	if (isUsefulPdfText(layered)) {
		return {
			title: null as string | null,
			markdown: layered,
		}
	}

	const vision = await extractPdfViaVision(buffer)

	if (!isUsefulPdfText(vision)) {
		throw new Error(
			"This PDF has no readable text. Try a text-based export or paste the text.",
		)
	}

	return {
		title: null as string | null,
		markdown: vision,
	}
}
