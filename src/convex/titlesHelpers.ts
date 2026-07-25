import { v } from "convex/values"
import { internalMutation, internalQuery } from "./_generated/server"

export const getNotebook = internalQuery({
	args: {
		notebookId: v.id("notebooks"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.notebookId)
	},
})

export const setTitleState = internalMutation({
	args: {
		notebookId: v.id("notebooks"),
		titleGenerationState: v.union(
			v.literal("idle"),
			v.literal("pending"),
			v.literal("complete"),
			v.literal("failed"),
		),
	},
	handler: async (ctx, args) => {
		const notebook = await ctx.db.get(args.notebookId)

		if (!notebook || notebook.titleOrigin === "manual") {
			return
		}

		await ctx.db.patch(args.notebookId, {
			titleGenerationState: args.titleGenerationState,
			updatedAt: Date.now(),
		})
	},
})

export const applyGeneratedTitle = internalMutation({
	args: {
		notebookId: v.id("notebooks"),
		title: v.string(),
	},
	handler: async (ctx, args) => {
		const notebook = await ctx.db.get(args.notebookId)

		if (!notebook || notebook.titleOrigin !== "placeholder") {
			return
		}

		await ctx.db.patch(args.notebookId, {
			title: args.title,
			titleOrigin: "generated",
			titleGenerationState: "complete",
			updatedAt: Date.now(),
		})
	},
})
