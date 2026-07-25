import { v } from "convex/values"
import { internalMutation } from "./_generated/server"
import { shouldCreateSourceRevision } from "./lib/chat-history"

async function getReadySelectedIds(ctx: { db: any }, notebookId: string) {
	const sources = await ctx.db
		.query("sources")
		.withIndex("by_notebook_createdAt", (q: any) =>
			q.eq("notebookId", notebookId),
		)
		.collect()

	return sources
		.filter(
			(source: {
				deletedAt?: number
				selected: boolean
				processingState: string
			}) =>
				!source.deletedAt &&
				source.selected &&
				source.processingState === "ready",
		)
		.map((source: { _id: string }) => source._id)
}

async function maybeAppendSourceBoundary(
	ctx: { db: any },
	notebook: {
		_id: any
		chatEpoch: number
		sourceRevision: number
	},
	nextIds: string[],
) {
	const messages = await ctx.db
		.query("chatEntries")
		.withIndex("by_notebook_epoch_createdAt", (q: any) =>
			q.eq("notebookId", notebook._id).eq("chatEpoch", notebook.chatEpoch),
		)
		.collect()

	const hasSuccessfulExchange = messages.some(
		(entry: { kind: string; role?: string; status?: string }) =>
			entry.kind === "message" &&
			entry.role === "assistant" &&
			entry.status === "complete",
	)

	const activeStreaming = messages.some(
		(entry: { kind: string; role?: string; status?: string }) =>
			entry.kind === "message" &&
			entry.role === "assistant" &&
			(entry.status === "pending" || entry.status === "streaming"),
	)

	if (!hasSuccessfulExchange || activeStreaming) {
		return notebook.sourceRevision + 1
	}

	const trailing = [...messages]
		.reverse()
		.find(
			(entry: { kind: string }) =>
				entry.kind === "sourceBoundary" || entry.kind === "message",
		)

	const now = Date.now()
	const nextRevision = notebook.sourceRevision + 1

	if (trailing?.kind === "sourceBoundary") {
		await ctx.db.patch(trailing._id, {
			sourceRevision: nextRevision,
			activeSourceCount: nextIds.length,
		})
	} else {
		await ctx.db.insert("chatEntries", {
			notebookId: notebook._id,
			chatEpoch: notebook.chatEpoch,
			kind: "sourceBoundary",
			sourceRevision: nextRevision,
			activeSourceCount: nextIds.length,
			createdAt: now,
		})
	}

	return nextRevision
}

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

		const revision = await maybeAppendSourceBoundary(ctx, notebook, nextIds)
		await ctx.db.patch(notebook._id, {
			sourceRevision: revision,
			updatedAt: Date.now(),
			lastUsedAt: Date.now(),
		})
	},
})
