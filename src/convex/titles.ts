"use node"

import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { v } from "convex/values"
import { requireEnv } from "src/lib/env"
import { MODELS } from "src/lib/limits"
import {
	looksLikeFilename,
	normalizeTitle,
	titleFromMarkdown,
} from "src/lib/source_title"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"

function cleanGeneratedTitle(raw: string) {
	return normalizeTitle(
		raw
			.replace(/^["'`“”]+|["'`“”]+$/g, "")
			.replace(/\s+/g, " ")
			.trim(),
		"",
	)
}

export const maybeGenerateNotebookTitle = internalAction({
	args: {
		notebookId: v.id("notebooks"),
		sourceId: v.id("sources"),
	},
	handler: async (ctx, args) => {
		const notebook = await ctx.runQuery(internal.titlesHelpers.getNotebook, {
			notebookId: args.notebookId,
		})

		if (
			notebook?.titleOrigin !== "placeholder" ||
			notebook.titleGenerationState === "pending" ||
			notebook.titleGenerationState === "complete"
		) {
			return
		}

		const source = await ctx.runQuery(internal.ingestionHelpers.getSource, {
			sourceId: args.sourceId,
		})

		if (!source?.normalizedStorageId) {
			return
		}

		await ctx.runMutation(internal.titlesHelpers.setTitleState, {
			notebookId: args.notebookId,
			titleGenerationState: "pending",
		})

		const applyTitle = async (title: string) => {
			await ctx.runMutation(internal.titlesHelpers.applyGeneratedTitle, {
				notebookId: args.notebookId,
				title,
			})
		}

		const fail = async () => {
			await ctx.runMutation(internal.titlesHelpers.setTitleState, {
				notebookId: args.notebookId,
				titleGenerationState: "failed",
			})
		}

		let markdown = ""

		try {
			const blob = await ctx.storage.get(source.normalizedStorageId)

			if (!blob) {
				throw new Error("Missing normalized source.")
			}

			markdown = (await blob.text()).slice(0, 4000)
			const openai = createOpenAI({
				apiKey: requireEnv("OPENAI_API_KEY"),
			})

			const result = await generateText({
				model: openai(MODELS.title),
				prompt: `Summarize this source into a short notebook title (max 8 words). Prefer a topical phrase over a document filename. Return only the title.\n\n${markdown}`,
			})

			const title = cleanGeneratedTitle(result.text)

			if (title && !looksLikeFilename(title)) {
				await applyTitle(title)
				return
			}

			throw new Error("Empty or filename-like generated title.")
		} catch {
			const fromContent = titleFromMarkdown(markdown, "")

			if (fromContent && !looksLikeFilename(fromContent)) {
				await applyTitle(fromContent)
				return
			}

			const fallback = normalizeTitle(source.title, "")

			if (fallback && !looksLikeFilename(fallback)) {
				await applyTitle(fallback)
				return
			}

			await fail()
		}
	},
})
