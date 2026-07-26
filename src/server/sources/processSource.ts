import { voyage } from "@ai-sdk/voyage"
import { embed, embedMany } from "ai"
import type { ConvexHttpClient } from "convex/browser"
import semantic from "semantic-chunker"
import { api } from "src/convex/_generated/api"
import type { Doc, Id } from "src/convex/_generated/dataModel"
import { deriveChunkLocators } from "src/lib/chunk_locators"
import { requireEnv } from "src/lib/env"
import { LIMITS, MODELS } from "src/lib/limits"
import { titleFromUrl } from "src/lib/source_title"
import { createAuthedConvexClient } from "src/server/convexClient"
import {
	assertSafeUrl,
	extractReadableHtml,
	fetchPublicHtml,
} from "src/server/sources/fetchHtml"
import {
	normalizeBufferToMarkdown,
	normalizeHtmlToMarkdown,
} from "src/server/sources/normalize"

async function uploadMarkdown(client: ConvexHttpClient, markdown: string) {
	const uploadUrl = await client.mutation(api.sources.generateUploadUrl, {})
	const response = await fetch(uploadUrl, {
		method: "POST",
		headers: { "Content-Type": "text/markdown" },
		body: new Blob([markdown], { type: "text/markdown" }),
	})

	if (!response.ok) {
		throw new Error("Couldn't save the processed source.")
	}

	const { storageId } = (await response.json()) as {
		storageId: Id<"_storage">
	}

	return storageId
}

async function extractMarkdown(
	client: ConvexHttpClient,
	source: Doc<"sources">,
) {
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
		const originalUrl = await client.query(api.sources.getOriginalContent, {
			sourceId: source._id,
		})

		if (!originalUrl) {
			throw new Error("The uploaded file is missing. Try uploading again.")
		}

		const response = await fetch(originalUrl)

		if (!response.ok) {
			throw new Error("Couldn't download the uploaded file. Try again.")
		}

		const buffer = Buffer.from(await response.arrayBuffer())
		const extension = source.filename?.includes(".")
			? `.${source.filename.split(".").pop()?.toLowerCase()}`
			: ".txt"
		const converted = await normalizeBufferToMarkdown(buffer, extension)

		markdown = converted.markdown

		if (!markdown && extension !== ".pdf") {
			markdown = buffer.toString("utf8").trim()
		}

		if (converted.title) {
			nextTitle = converted.title
		}
	} else {
		throw new Error("This source has no content to process.")
	}

	if (!markdown) {
		throw new Error("Couldn't find readable text in this source.")
	}

	if (markdown.length > LIMITS.maxExtractedCharacters) {
		throw new Error(
			`Source text can be at most ${LIMITS.maxExtractedCharacters.toLocaleString()} characters.`,
		)
	}

	return { markdown, nextTitle }
}

export async function processSourcePipeline(
	sourceId: Id<"sources">,
	token: string,
) {
	const client = createAuthedConvexClient(token)
	const source = (await client.query(api.sources.get, {
		sourceId,
	})) as Doc<"sources"> | null

	if (!source || source.deletedAt) {
		return
	}

	try {
		requireEnv("VOYAGE_API_KEY")

		await client.mutation(api.ingestion.setProcessingState, {
			sourceId,
			processingState: "extracting",
		})

		const { markdown, nextTitle } = await extractMarkdown(client, source)
		const normalizedStorageId = await uploadMarkdown(client, markdown)

		await client.mutation(api.ingestion.setExtracted, {
			sourceId,
			title: nextTitle,
			normalizedStorageId,
			characterCount: markdown.length,
		})

		await client.mutation(api.ingestion.setProcessingState, {
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
			throw new Error("Couldn't prepare this source for chat. Try again.")
		}

		const locators = deriveChunkLocators(texts, markdown)

		await client.mutation(api.ingestion.setProcessingState, {
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

		await client.mutation(api.ingestion.replaceChunks, {
			sourceId,
			chunks: texts.map((text, index) => ({
				text,
				ordinal: locators[index]?.ordinal ?? index,
				startOffset: locators[index]?.startOffset ?? 0,
				endOffset: locators[index]?.endOffset ?? text.length,
				embedding: vectors[index] ?? [],
			})),
		})

		await client.mutation(api.ingestion.markReady, {
			sourceId,
		})
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Couldn't process this source."

		await client.mutation(api.ingestion.markFailed, {
			sourceId,
			errorCode: message.slice(0, 200),
		})
	}
}
