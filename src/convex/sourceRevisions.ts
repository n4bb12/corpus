import { v } from "convex/values"
import { shouldCreateSourceRevision } from "src/lib/chat_history"
import { internalMutation } from "./_generated/server"
import {
	applySourceSelectionBoundary,
	getReadySelectedIds,
} from "./lib/sourceBoundaries"

export const markReadySelectedRevision = internalMutation({
	args: {
		sourceId: v.id("sources"),
	},
	handler: async (ctx, args) => {
		const source = await ctx.db.get(args.sourceId)

		if (!source || source.deletedAt || !source.selected) {
			return
		}

		const notebook = await ctx.db.get(source.notebookId)

		if (!notebook || notebook.deletedAt) {
			return
		}

		const previousWithout = (
			await getReadySelectedIds(ctx, notebook._id)
		).filter((id: string) => id !== source._id)
		const nextIds = await getReadySelectedIds(ctx, notebook._id)

		if (!shouldCreateSourceRevision(previousWithout, nextIds)) {
			return
		}

		const boundary = await applySourceSelectionBoundary(
			ctx,
			notebook,
			previousWithout,
			nextIds,
		)
		await ctx.db.patch(notebook._id, {
			sourceRevision: boundary.sourceRevision,
			chatSelectionHash: boundary.chatSelectionHash,
			updatedAt: Date.now(),
			lastUsedAt: Date.now(),
		})
	},
})
