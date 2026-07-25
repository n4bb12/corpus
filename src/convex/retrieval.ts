"use node"

import { voyage } from "@ai-sdk/voyage"
import { embed, rerank } from "ai"
import { v } from "convex/values"
import { MODELS } from "src/lib/limits"
import {
	mergeRetrievalCandidates,
	selectEvidenceWithinBudget,
} from "src/lib/retrieval"
import { api, internal } from "./_generated/api"
import { action } from "./_generated/server"
import { authComponent } from "./auth"

export const prepareEvidence = action({
	args: {
		notebookId: v.id("notebooks"),
		prompt: v.string(),
		sourceIds: v.array(v.id("sources")),
	},
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx)

		if (!user) {
			throw new Error("You need to sign in to continue.")
		}

		await ctx.runQuery(api.notebooks.get, {
			notebookId: args.notebookId,
		})

		const { embedding: vector } = await embed({
			model: voyage.textEmbedding(MODELS.embed),
			value: args.prompt,
			providerOptions: {
				voyage: {
					inputType: "query",
				},
			},
		})

		const vectorHits = await ctx.runAction(
			internal.retrievalHelpers.searchVectors,
			{
				notebookId: args.notebookId,
				sourceIds: args.sourceIds,
				embedding: vector,
			},
		)

		const textHits = await ctx.runQuery(internal.retrievalHelpers.searchText, {
			notebookId: args.notebookId,
			sourceIds: args.sourceIds,
			prompt: args.prompt,
		})

		const merged = mergeRetrievalCandidates(vectorHits, textHits)
		let ranked = merged

		if (merged.length) {
			try {
				const { ranking } = await rerank({
					model: voyage.reranking(MODELS.rerank),
					documents: merged.map((item) => item.text),
					query: args.prompt,
					topN: Math.min(12, merged.length),
				})

				ranked = ranking
					.map((item) => {
						const candidate = merged[item.originalIndex]

						if (!candidate) {
							return null
						}

						return {
							...candidate,
							score: item.score,
						}
					})
					.filter((item): item is (typeof merged)[number] => Boolean(item))
			} catch {
				ranked = merged
			}
		}

		const selected = selectEvidenceWithinBudget(ranked, 12_000)

		return {
			evidence: selected,
			insufficient: !selected.length,
		}
	},
})
