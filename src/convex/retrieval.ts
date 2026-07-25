"use node"

import { v } from "convex/values"
import { VoyageAIClient } from "voyageai"
import { api, internal } from "./_generated/api"
import { action } from "./_generated/server"
import { authComponent } from "./auth"
import { MODELS } from "./lib/limits"
import {
	mergeRetrievalCandidates,
	selectEvidenceWithinBudget,
} from "./lib/retrieval"

function getVoyage() {
	const apiKey = process.env.VOYAGE_API_KEY

	if (!apiKey) {
		throw new Error("VOYAGE_API_KEY is not configured.")
	}

	return new VoyageAIClient({ apiKey })
}

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

		const voyage = getVoyage()
		const embedded = await voyage.embed({
			input: [args.prompt],
			model: MODELS.embed,
			inputType: "query",
		})
		const vector = embedded.data?.[0]?.embedding

		if (!vector) {
			throw new Error("Could not embed the question.")
		}

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
				const reranked = await voyage.rerank({
					query: args.prompt,
					documents: merged.map((item) => item.text),
					model: MODELS.rerank,
					topK: Math.min(12, merged.length),
				})

				ranked =
					reranked.data
						?.map((item) => {
							const candidate = merged[item.index ?? 0]

							if (!candidate) {
								return null
							}

							return {
								...candidate,
								score: item.relevanceScore ?? candidate.score,
							}
						})
						.filter((item): item is (typeof merged)[number] => Boolean(item)) ??
					merged
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
