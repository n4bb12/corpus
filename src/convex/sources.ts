import { v } from "convex/values"
import { shouldCreateSourceRevision } from "src/lib/chat_history"
import { LIMITS } from "src/lib/limits"
import { quotaResetMessage, utcDateKey } from "src/lib/quotas"
import {
	normalizeTitle,
	titleFromFilename,
	titleFromPastedText,
	titleFromUrl,
} from "src/lib/source_title"
import { internal } from "./_generated/api"
import { mutation, query } from "./_generated/server"
import {
	requireNotebookOwner,
	requireSourceOwner,
	requireUser,
} from "./lib/ownership"

async function bumpUsage(
	ctx: { db: any },
	userId: string,
	field: "ingestions" | "generations",
) {
	const dateKey = utcDateKey()
	const existing = await ctx.db
		.query("dailyUsage")
		.withIndex("by_user_date", (q: any) =>
			q.eq("userId", userId).eq("dateKey", dateKey),
		)
		.unique()

	if (!existing) {
		await ctx.db.insert("dailyUsage", {
			userId,
			dateKey,
			ingestions: field === "ingestions" ? 1 : 0,
			generations: field === "generations" ? 1 : 0,
		})
		return
	}

	await ctx.db.patch(existing._id, {
		[field]: existing[field] + 1,
	})
}

async function assertIngestionQuota(ctx: { db: any }, userId: string) {
	const dateKey = utcDateKey()
	const existing = await ctx.db
		.query("dailyUsage")
		.withIndex("by_user_date", (q: any) =>
			q.eq("userId", userId).eq("dateKey", dateKey),
		)
		.unique()

	if ((existing?.ingestions ?? 0) >= LIMITS.ingestionsPerDay) {
		throw new Error(quotaResetMessage("ingestion", dateKey))
	}
}

async function countVisibleSources(ctx: { db: any }, notebookId: string) {
	const sources = await ctx.db
		.query("sources")
		.withIndex("by_notebook_createdAt", (q: any) =>
			q.eq("notebookId", notebookId),
		)
		.collect()

	return sources.filter((source: { deletedAt?: number }) => !source.deletedAt)
		.length
}

async function getReadySelectedIds(
	ctx: { db: any },
	notebookId: string,
): Promise<string[]> {
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
	const previousIds = await getReadySelectedIds(ctx, notebook._id)

	// previousIds already reflects current DB; callers should compute before mutation.
	void previousIds

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

export const listByNotebook = query({
	args: {
		notebookId: v.id("notebooks"),
	},
	handler: async (ctx, args) => {
		await requireNotebookOwner(ctx, args.notebookId)
		const sources = await ctx.db
			.query("sources")
			.withIndex("by_notebook_createdAt", (q) =>
				q.eq("notebookId", args.notebookId),
			)
			.order("desc")
			.collect()

		return sources.filter((source) => !source.deletedAt)
	},
})

export const get = query({
	args: {
		sourceId: v.id("sources"),
	},
	handler: async (ctx, args) => {
		const { source } = await requireSourceOwner(ctx, args.sourceId)
		return source
	},
})

export const getNormalizedContent = query({
	args: {
		sourceId: v.id("sources"),
	},
	handler: async (ctx, args) => {
		const { source } = await requireSourceOwner(ctx, args.sourceId)

		if (!source.normalizedStorageId) {
			return null
		}

		const url = await ctx.storage.getUrl(source.normalizedStorageId)
		return url
	},
})

export const getOriginalContent = query({
	args: {
		sourceId: v.id("sources"),
	},
	handler: async (ctx, args) => {
		const { source } = await requireSourceOwner(ctx, args.sourceId)

		if (!source.originalStorageId) {
			return null
		}

		return await ctx.storage.getUrl(source.originalStorageId)
	},
})

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		await requireUser(ctx)
		return await ctx.storage.generateUploadUrl()
	},
})

export const addText = mutation({
	args: {
		notebookId: v.id("notebooks"),
		text: v.string(),
	},
	handler: async (ctx, args) => {
		const { user, notebook } = await requireNotebookOwner(ctx, args.notebookId)
		const text = args.text.trim()

		if (!text) {
			throw new Error("Paste some text before adding a source.")
		}

		if (text.length > LIMITS.maxPastedCharacters) {
			throw new Error(
				`Pasted text can be at most ${LIMITS.maxPastedCharacters.toLocaleString()} characters.`,
			)
		}

		await assertIngestionQuota(ctx, user._id)

		const visible = await countVisibleSources(ctx, notebook._id)

		if (visible >= LIMITS.sourcesPerNotebook) {
			throw new Error(
				`Each notebook can hold up to ${LIMITS.sourcesPerNotebook} sources.`,
			)
		}

		const now = Date.now()
		const title = titleFromPastedText(text)

		const sourceId = await ctx.db.insert("sources", {
			ownerId: user._id,
			notebookId: notebook._id,
			kind: "text",
			title,
			originalTitle: title,
			textContent: text,
			selected: true,
			processingState: "pending",
			createdAt: now,
			updatedAt: now,
		})

		await bumpUsage(ctx, user._id, "ingestions")
		await ctx.db.patch(notebook._id, {
			updatedAt: now,
			lastUsedAt: now,
		})

		return sourceId
	},
})

export const addUrl = mutation({
	args: {
		notebookId: v.id("notebooks"),
		url: v.string(),
	},
	handler: async (ctx, args) => {
		const { user, notebook } = await requireNotebookOwner(ctx, args.notebookId)
		const url = args.url.trim()

		if (!url) {
			throw new Error("Enter a URL to add.")
		}

		await assertIngestionQuota(ctx, user._id)

		const visible = await countVisibleSources(ctx, notebook._id)

		if (visible >= LIMITS.sourcesPerNotebook) {
			throw new Error(
				`Each notebook can hold up to ${LIMITS.sourcesPerNotebook} sources.`,
			)
		}

		const now = Date.now()
		const title = titleFromUrl(url)

		const sourceId = await ctx.db.insert("sources", {
			ownerId: user._id,
			notebookId: notebook._id,
			kind: "url",
			title,
			originalTitle: title,
			url,
			selected: true,
			processingState: "pending",
			createdAt: now,
			updatedAt: now,
		})

		await bumpUsage(ctx, user._id, "ingestions")
		await ctx.db.patch(notebook._id, {
			updatedAt: now,
			lastUsedAt: now,
		})

		return sourceId
	},
})

export const addFile = mutation({
	args: {
		notebookId: v.id("notebooks"),
		storageId: v.id("_storage"),
		filename: v.string(),
		mimeType: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { user, notebook } = await requireNotebookOwner(ctx, args.notebookId)

		await assertIngestionQuota(ctx, user._id)

		const visible = await countVisibleSources(ctx, notebook._id)

		if (visible >= LIMITS.sourcesPerNotebook) {
			throw new Error(
				`Each notebook can hold up to ${LIMITS.sourcesPerNotebook} sources.`,
			)
		}

		const now = Date.now()
		const title = titleFromFilename(args.filename)

		const sourceId = await ctx.db.insert("sources", {
			ownerId: user._id,
			notebookId: notebook._id,
			kind: "file",
			title,
			originalTitle: title,
			filename: args.filename,
			mimeType: args.mimeType,
			originalStorageId: args.storageId,
			selected: true,
			processingState: "pending",
			createdAt: now,
			updatedAt: now,
		})

		await bumpUsage(ctx, user._id, "ingestions")
		await ctx.db.patch(notebook._id, {
			updatedAt: now,
			lastUsedAt: now,
		})

		return sourceId
	},
})

export const rename = mutation({
	args: {
		sourceId: v.id("sources"),
		title: v.string(),
	},
	handler: async (ctx, args) => {
		const { source } = await requireSourceOwner(ctx, args.sourceId)
		await ctx.db.patch(source._id, {
			title: normalizeTitle(args.title, source.originalTitle),
			updatedAt: Date.now(),
		})
	},
})

export const setSelected = mutation({
	args: {
		sourceId: v.id("sources"),
		selected: v.boolean(),
	},
	handler: async (ctx, args) => {
		const { source, notebook } = await requireSourceOwner(ctx, args.sourceId)

		if (source.processingState === "failed") {
			throw new Error("Failed sources cannot be selected.")
		}

		const previousIds = await getReadySelectedIds(ctx, notebook._id)
		await ctx.db.patch(source._id, {
			selected: args.selected,
			updatedAt: Date.now(),
		})

		const nextSources = await ctx.db
			.query("sources")
			.withIndex("by_notebook_createdAt", (q) =>
				q.eq("notebookId", notebook._id),
			)
			.collect()

		const nextIds = nextSources
			.filter(
				(entry) =>
					!entry.deletedAt &&
					entry.selected &&
					entry.processingState === "ready",
			)
			.map((entry) => entry._id)

		if (
			source.processingState === "ready" &&
			shouldCreateSourceRevision(previousIds, nextIds)
		) {
			const revision = await maybeAppendSourceBoundary(ctx, notebook, nextIds)
			await ctx.db.patch(notebook._id, {
				sourceRevision: revision,
				updatedAt: Date.now(),
				lastUsedAt: Date.now(),
			})
		}
	},
})

export const setSelectedMany = mutation({
	args: {
		notebookId: v.id("notebooks"),
		sourceIds: v.array(v.id("sources")),
		selected: v.boolean(),
	},
	handler: async (ctx, args) => {
		const { notebook } = await requireNotebookOwner(ctx, args.notebookId)
		const previousIds = await getReadySelectedIds(ctx, notebook._id)

		for (const sourceId of args.sourceIds) {
			const source = await ctx.db.get(sourceId)

			if (
				!source ||
				source.deletedAt ||
				source.notebookId !== notebook._id ||
				source.processingState === "failed"
			) {
				continue
			}

			await ctx.db.patch(source._id, {
				selected: args.selected,
				updatedAt: Date.now(),
			})
		}

		const nextSources = await ctx.db
			.query("sources")
			.withIndex("by_notebook_createdAt", (q) =>
				q.eq("notebookId", notebook._id),
			)
			.collect()

		const nextIds = nextSources
			.filter(
				(entry) =>
					!entry.deletedAt &&
					entry.selected &&
					entry.processingState === "ready",
			)
			.map((entry) => entry._id)

		if (shouldCreateSourceRevision(previousIds, nextIds)) {
			const revision = await maybeAppendSourceBoundary(ctx, notebook, nextIds)
			await ctx.db.patch(notebook._id, {
				sourceRevision: revision,
				updatedAt: Date.now(),
				lastUsedAt: Date.now(),
			})
		}
	},
})

export const remove = mutation({
	args: {
		sourceId: v.id("sources"),
	},
	handler: async (ctx, args) => {
		const { source, notebook } = await requireSourceOwner(ctx, args.sourceId)
		const previousIds = await getReadySelectedIds(ctx, notebook._id)
		const now = Date.now()

		await ctx.db.patch(source._id, {
			deletedAt: now,
			selected: false,
			updatedAt: now,
		})

		const nextIds = previousIds.filter((id: string) => id !== source._id)

		if (
			source.processingState === "ready" &&
			source.selected &&
			shouldCreateSourceRevision(previousIds, nextIds)
		) {
			const revision = await maybeAppendSourceBoundary(ctx, notebook, nextIds)
			await ctx.db.patch(notebook._id, {
				sourceRevision: revision,
				updatedAt: now,
				lastUsedAt: now,
			})
		} else {
			await ctx.db.patch(notebook._id, {
				updatedAt: now,
				lastUsedAt: now,
			})
		}

		await ctx.scheduler.runAfter(0, internal.cleanup.deleteSourceBatch, {
			sourceId: source._id,
			cursor: null,
		})
	},
})

export const retry = mutation({
	args: {
		sourceId: v.id("sources"),
	},
	handler: async (ctx, args) => {
		const { user, source } = await requireSourceOwner(ctx, args.sourceId)

		if (source.processingState !== "failed") {
			throw new Error("Only failed sources can be retried.")
		}

		await assertIngestionQuota(ctx, user._id)
		await ctx.db.patch(source._id, {
			processingState: "pending",
			errorCode: undefined,
			updatedAt: Date.now(),
			selected: true,
		})
		await bumpUsage(ctx, user._id, "ingestions")
	},
})
