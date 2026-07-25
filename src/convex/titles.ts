"use node"

import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { v } from "convex/values"
import { requireEnv } from "src/lib/env"
import { MODELS, UNTITLED_NOTEBOOK } from "src/lib/limits"
import { normalizeTitle } from "src/lib/source_title"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"

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

		try {
			const blob = await ctx.storage.get(source.normalizedStorageId)

			if (!blob) {
				throw new Error("Missing normalized source.")
			}

			const markdown = (await blob.text()).slice(0, 4000)
			const openai = createOpenAI({
				apiKey: requireEnv("OPENAI_API_KEY"),
			})

			const result = await generateText({
				model: openai(MODELS.title),
				prompt: `Create a short notebook title (max 8 words) for notes grounded in this source. Return only the title.\n\n${markdown}`,
			})

			const title = normalizeTitle(result.text, UNTITLED_NOTEBOOK)

			await ctx.runMutation(internal.titlesHelpers.applyGeneratedTitle, {
				notebookId: args.notebookId,
				title,
			})
		} catch {
			await ctx.runMutation(internal.titlesHelpers.setTitleState, {
				notebookId: args.notebookId,
				titleGenerationState: "failed",
			})
		}
	},
})
