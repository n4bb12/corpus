import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalMutation, internalQuery } from "./_generated/server"

export const getSource = internalQuery({
	args: {
		sourceId: v.id("sources"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.sourceId)
	},
})

export const setProcessingState = internalMutation({
	args: {
		sourceId: v.id("sources"),
		processingState: v.union(
			v.literal("pending"),
			v.literal("extracting"),
			v.literal("chunking"),
			v.literal("embedding"),
			v.literal("ready"),
			v.literal("failed"),
		),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.sourceId, {
			processingState: args.processingState,
			updatedAt: Date.now(),
		})
	},
})

export const setExtracted = internalMutation({
	args: {
		sourceId: v.id("sources"),
		title: v.string(),
		normalizedStorageId: v.id("_storage"),
		characterCount: v.number(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.sourceId, {
			title: args.title,
			normalizedStorageId: args.normalizedStorageId,
			characterCount: args.characterCount,
			updatedAt: Date.now(),
		})
	},
})

export const replaceChunks = internalMutation({
	args: {
		sourceId: v.id("sources"),
		chunks: v.array(
			v.object({
				text: v.string(),
				ordinal: v.number(),
				startOffset: v.number(),
				endOffset: v.number(),
				embedding: v.array(v.float64()),
			}),
		),
	},
	handler: async (ctx, args) => {
		const source = await ctx.db.get(args.sourceId)

		if (!source) {
			return
		}

		const existing = await ctx.db
			.query("chunks")
			.withIndex("by_source_ordinal", (q) => q.eq("sourceId", args.sourceId))
			.collect()

		for (const chunk of existing) {
			await ctx.db.delete(chunk._id)
		}

		for (const chunk of args.chunks) {
			await ctx.db.insert("chunks", {
				ownerId: source.ownerId,
				notebookId: source.notebookId,
				sourceId: source._id,
				text: chunk.text,
				searchableText: chunk.text,
				ordinal: chunk.ordinal,
				startOffset: chunk.startOffset,
				endOffset: chunk.endOffset,
				embedding: chunk.embedding,
			})
		}
	},
})

export const markReady = internalMutation({
	args: {
		sourceId: v.id("sources"),
	},
	handler: async (ctx, args) => {
		const source = await ctx.db.get(args.sourceId)

		if (!source) {
			return
		}

		await ctx.db.patch(args.sourceId, {
			processingState: "ready",
			errorCode: undefined,
			updatedAt: Date.now(),
		})

		if (source.selected) {
			await ctx.scheduler.runAfter(
				0,
				internal.sourceRevisions.markReadySelectedRevision,
				{
					sourceId: args.sourceId,
				},
			)
		}
	},
})

export const markFailed = internalMutation({
	args: {
		sourceId: v.id("sources"),
		errorCode: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.sourceId, {
			processingState: "failed",
			selected: false,
			errorCode: args.errorCode,
			updatedAt: Date.now(),
		})
	},
})
