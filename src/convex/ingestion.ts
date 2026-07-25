"use node"

import dns from "node:dns/promises"
import { MDocument } from "@mastra/rag"
import { v } from "convex/values"
import { MarkItDown } from "markitdown-ts"
import { VoyageAIClient } from "voyageai"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"
import { deriveChunkLocators } from "./lib/chunk-locators"
import { LIMITS, MODELS } from "./lib/limits"
import { titleFromUrl } from "./lib/source-title"
import {
	isBlockedResolvedAddress,
	validatePublicHttpUrl,
} from "./lib/url-safety"

const markitdown = new MarkItDown()

function getVoyage() {
	const apiKey = process.env.VOYAGE_API_KEY

	if (!apiKey) {
		throw new Error("VOYAGE_API_KEY is not configured.")
	}

	return new VoyageAIClient({ apiKey })
}

async function assertSafeUrl(raw: string) {
	const validated = validatePublicHttpUrl(raw)

	if (!validated.ok) {
		throw new Error(validated.error)
	}

	const records = await dns.lookup(validated.url.hostname, { all: true })

	for (const record of records) {
		if (isBlockedResolvedAddress(record.address)) {
			throw new Error("That host resolves to a blocked address.")
		}
	}

	return validated.url
}

async function fetchPublicHtml(url: URL) {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 15_000)

	try {
		let current = url
		let response: Response | null = null

		for (let redirect = 0; redirect < 4; redirect += 1) {
			await assertSafeUrl(current.toString())
			response = await fetch(current, {
				redirect: "manual",
				signal: controller.signal,
				headers: {
					"User-Agent": "CorpusBot/1.0",
					Accept: "text/html,application/xhtml+xml",
				},
			})

			if (response.status >= 300 && response.status < 400) {
				const location = response.headers.get("location")

				if (!location) {
					throw new Error("The URL redirected without a location.")
				}

				current = new URL(location, current)
				continue
			}

			break
		}

		if (!response || !response.ok) {
			throw new Error("The URL could not be fetched.")
		}

		const contentType = response.headers.get("content-type") ?? ""

		if (
			!contentType.includes("text/html") &&
			!contentType.includes("application/xhtml")
		) {
			throw new Error("Only public HTML pages are supported.")
		}

		const reader = response.body?.getReader()

		if (!reader) {
			throw new Error("The URL response was empty.")
		}

		const chunks: Uint8Array[] = []
		let total = 0

		while (true) {
			const { done, value } = await reader.read()

			if (done) {
				break
			}

			total += value.byteLength

			if (total > LIMITS.maxUrlResponseBytes) {
				throw new Error(
					`Fetched pages can be at most ${LIMITS.maxUrlResponseBytes / (1024 * 1024)}MB.`,
				)
			}

			chunks.push(value)
		}

		const html = new TextDecoder().decode(
			Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
		)
		return { html, finalUrl: current.toString() }
	} finally {
		clearTimeout(timeout)
	}
}

function extractReadableHtml(html: string) {
	const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
	const title = titleMatch?.[1]?.trim() ?? null
	const articleMatch =
		html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ??
		html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ??
		html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)

	const body = articleMatch?.[1] ?? html
	const cleaned = body
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<noscript[\s\S]*?<\/noscript>/gi, "")

	return { title, html: cleaned }
}

export const processSource = internalAction({
	args: {
		sourceId: v.id("sources"),
	},
	handler: async (ctx, args) => {
		const source = await ctx.runQuery(internal.ingestionHelpers.getSource, {
			sourceId: args.sourceId,
		})

		if (!source || source.deletedAt) {
			return
		}

		try {
			await ctx.runMutation(internal.ingestionHelpers.setProcessingState, {
				sourceId: args.sourceId,
				processingState: "extracting",
			})

			let markdown = ""
			let nextTitle = source.title

			if (source.kind === "url" && source.url) {
				const safeUrl = await assertSafeUrl(source.url)
				const { html, finalUrl } = await fetchPublicHtml(safeUrl)
				const readable = extractReadableHtml(html)
				const converted = await markitdown.convertBuffer(
					Buffer.from(`<html><body>${readable.html}</body></html>`),
					{ file_extension: ".html" },
				)

				markdown = converted?.markdown?.trim() ?? ""
				nextTitle = titleFromUrl(finalUrl, readable.title ?? converted?.title)
			} else if (source.textContent) {
				markdown = source.textContent.trim()
			} else if (source.originalStorageId) {
				const blob = await ctx.storage.get(source.originalStorageId)

				if (!blob) {
					throw new Error("Original upload is missing.")
				}

				const buffer = Buffer.from(await blob.arrayBuffer())
				const extension = source.filename?.includes(".")
					? `.${source.filename.split(".").pop()}`
					: source.kind === "text"
						? ".txt"
						: ".txt"

				const converted = await markitdown.convertBuffer(buffer, {
					file_extension: extension,
				})
				markdown = converted?.markdown?.trim() ?? buffer.toString("utf8").trim()
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

			const normalizedBlob = new Blob([markdown], { type: "text/markdown" })
			const normalizedStorageId = await ctx.storage.store(normalizedBlob)

			await ctx.runMutation(internal.ingestionHelpers.setExtracted, {
				sourceId: args.sourceId,
				title: nextTitle,
				normalizedStorageId,
				characterCount: markdown.length,
			})

			await ctx.runMutation(internal.ingestionHelpers.setProcessingState, {
				sourceId: args.sourceId,
				processingState: "chunking",
			})

			const document = MDocument.fromMarkdown(markdown)
			const chunks = await document.chunk({
				strategy: "semantic-markdown",
				maxSize: 1200,
			})
			const texts = chunks.map((chunk) => chunk.text).filter(Boolean)
			const locators = deriveChunkLocators(texts, markdown)

			await ctx.runMutation(internal.ingestionHelpers.setProcessingState, {
				sourceId: args.sourceId,
				processingState: "embedding",
			})

			const voyage = getVoyage()
			const embedded = await voyage.embed({
				input: texts,
				model: MODELS.embed,
				inputType: "document",
			})

			const vectors = embedded.data?.map((item) => item.embedding ?? []) ?? []

			await ctx.runMutation(internal.ingestionHelpers.replaceChunks, {
				sourceId: args.sourceId,
				chunks: texts.map((text, index) => ({
					text,
					ordinal: locators[index]?.ordinal ?? index,
					startOffset: locators[index]?.startOffset ?? 0,
					endOffset: locators[index]?.endOffset ?? text.length,
					embedding: vectors[index] ?? [],
				})),
			})

			await ctx.runMutation(internal.ingestionHelpers.markReady, {
				sourceId: args.sourceId,
			})

			await ctx.scheduler.runAfter(
				0,
				internal.titles.maybeGenerateNotebookTitle,
				{
					notebookId: source.notebookId,
					sourceId: args.sourceId,
				},
			)
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Source processing failed."

			await ctx.runMutation(internal.ingestionHelpers.markFailed, {
				sourceId: args.sourceId,
				errorCode: message.slice(0, 200),
			})
		}
	},
})
