import { voyage } from "@ai-sdk/voyage"
import { embed, embedMany } from "ai"
import semantic from "semantic-chunker"
import { api } from "src/convex/_generated/api"
import type { Doc, Id } from "src/convex/_generated/dataModel"
import { fetchAuthMutation, fetchAuthQuery } from "src/lib/auth-server"
import { deriveChunkLocators } from "src/lib/chunk_locators"
import { requireEnv } from "src/lib/env"
import { LIMITS, MODELS } from "src/lib/limits"
import { titleFromUrl } from "src/lib/source_title"
import {
	assertSafeUrl,
	extractReadableHtml,
	fetchPublicHtml,
} from "src/server/sources/fetchHtml"
import {
	normalizeBufferToMarkdown,
	normalizeHtmlToMarkdown,
} from "src/server/sources/normalize"

async function uploadMarkdown(markdown: string) {
	const uploadUrl = await fetchAuthMutation(api.sources.generateUploadUrl, {})
	const response = await fetch(uploadUrl, {
		method: "POST",
		headers: { "Content-Type": "text/markdown" },
		body: new Blob([markdown], { type: "text/markdown" }),
	})

	if (!response.ok) {
		throw new Error("Could not store normalized source content.")
	}

	const { storageId } = (await response.json()) as {
		storageId: Id<"_storage">
	}

	return storageId
}

async function extractMarkdown(source: Doc<"sources">) {
	let markdown = ""
	let nextTitle = source.title

	if (source.kind === "url" && source.url) {
		const safeUrl = await assertSafeUrl(source.url)
		const { html, finalUrl } = await fetchPublicHtml(safeUrl)
		const readable = extractReadableHtml(html)
		const converted = await normalizeHtmlToMarkdown(readable.html)

		markdown = converted.markdown
		nextTitle = titleFromUrl(finalUrl, readable.title ?? converted.title)
	} else if (source.textContent) {
		markdown = source.textContent.trim()
	} else if (source.originalStorageId) {
		const originalUrl = await fetchAuthQuery(api.sources.getOriginalContent, {
			sourceId: source._id,
		})

		if (!originalUrl) {
			throw new Error("Original upload is missing.")
		}

		const response = await fetch(originalUrl)

		if (!response.ok) {
			throw new Error("Original upload could not be downloaded.")
		}

		const buffer = Buffer.from(await response.arrayBuffer())
		const extension = source.filename?.includes(".")
			? `.${source.filename.split(".").pop()}`
			: ".txt"
		const converted = await normalizeBufferToMarkdown(buffer, extension)

		markdown = converted.markdown || buffer.toString("utf8").trim()
	} else {
		throw new Error("Source content is missing.")
	}

	if (!markdown) {
		throw new Error("No useful text could be extracted.")
	}

	if (markdown.length > LIMITS.maxExtractedCharacters) {
		throw new Error(
			`Extracted text can be at most ${LIMITS.maxExtractedCharacters.toLocaleString()} characters.`,
		)
	}

	return { markdown, nextTitle }
}

export async function processSourcePipeline(sourceId: Id<"sources">) {
	const source = (await fetchAuthQuery(api.sources.get, {
		sourceId,
	})) as Doc<"sources"> | null

	if (!source || source.deletedAt) {
		return
	}

	try {
		requireEnv("VOYAGE_API_KEY")

		await fetchAuthMutation(api.ingestion.setProcessingState, {
			sourceId,
			processingState: "extracting",
		})

		const { markdown, nextTitle } = await extractMarkdown(source)
		const normalizedStorageId = await uploadMarkdown(markdown)

		await fetchAuthMutation(api.ingestion.setExtracted, {
			sourceId,
			title: nextTitle,
			normalizedStorageId,
			characterCount: markdown.length,
		})

		await fetchAuthMutation(api.ingestion.setProcessingState, {
			sourceId,
			processingState: "chunking",
		})

		const embeddingModel = voyage.textEmbedding(MODELS.embed)
		const chunker = semantic({
			embed: async (text) => {
				const { embedding } = await embed({
					model: embeddingModel,
					value: text,
					providerOptions: {
						voyage: {
							inputType: "document",
						},
					},
				})

				return embedding
			},
			splitMode: "markdown",
			maxChunkSize: 1200,
			minChunkSize: 200,
			zScoreThreshold: 1,
		})
		const texts: string[] = []

		for await (const [text] of chunker(markdown)) {
			const trimmed = text.trim()

			if (trimmed) {
				texts.push(trimmed)
			}
		}

		if (!texts.length) {
			throw new Error("No useful chunks could be created.")
		}

		const locators = deriveChunkLocators(texts, markdown)

		await fetchAuthMutation(api.ingestion.setProcessingState, {
			sourceId,
			processingState: "embedding",
		})

		const { embeddings: vectors } = await embedMany({
			model: embeddingModel,
			values: texts,
			providerOptions: {
				voyage: {
					inputType: "document",
				},
			},
		})

		await fetchAuthMutation(api.ingestion.replaceChunks, {
			sourceId,
			chunks: texts.map((text, index) => ({
				text,
				ordinal: locators[index]?.ordinal ?? index,
				startOffset: locators[index]?.startOffset ?? 0,
				endOffset: locators[index]?.endOffset ?? text.length,
				embedding: vectors[index] ?? [],
			})),
		})

		await fetchAuthMutation(api.ingestion.markReady, {
			sourceId,
		})
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Source processing failed."

		await fetchAuthMutation(api.ingestion.markFailed, {
			sourceId,
			errorCode: message.slice(0, 200),
		})
	}
}
