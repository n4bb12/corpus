import { v } from "convex/values"
import { shouldCreateSourceRevision } from "src/lib/chatHistory"
import { describeRejectedFile, isAcceptedUpload } from "src/lib/fileTypes"
import { LIMITS } from "src/lib/limits"
import { quotaResetMessage, remainingQuota, utcDateKey } from "src/lib/quotas"
import {
  normalizeTitle,
  titleFromFilename,
  titleFromPastedText,
  titleFromUrl,
} from "src/lib/sourceTitle"
import { validatePublicHttpUrl } from "src/lib/urlSafety"
import { internal } from "./_generated/api"
import { mutation, query } from "./_generated/server"
import { appError } from "./lib/appError"
import {
  requireNotebookOwner,
  requireSourceOwner,
  requireUser,
} from "./lib/ownership"
import {
  applySourceSelectionBoundary,
  getReadySelectedIds,
} from "./lib/sourceBoundaries"
import { scheduleNotebookTitleRefresh } from "./titles"

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
    throw appError(quotaResetMessage("ingestion"))
  }
}

export const getIngestionQuota = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const dateKey = utcDateKey()
    const existing = await ctx.db
      .query("dailyUsage")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("dateKey", dateKey),
      )
      .unique()

    const used = existing?.ingestions ?? 0
    const limit = LIMITS.ingestionsPerDay

    return {
      used,
      limit,
      remaining: remainingQuota(used, limit),
      exhausted: used >= limit,
    }
  },
})

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

export const listChunks = query({
  args: {
    sourceId: v.id("sources"),
  },
  handler: async (ctx, args) => {
    await requireSourceOwner(ctx, args.sourceId)
    const chunks = await ctx.db
      .query("chunks")
      .withIndex("by_source_ordinal", (q) => q.eq("sourceId", args.sourceId))
      .collect()

    return chunks
      .filter((chunk) => !chunk.deletedAt)
      .map((chunk) => ({
        chunkId: chunk._id,
        text: chunk.text,
        ordinal: chunk.ordinal,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
      }))
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
    const user = await requireUser(ctx)
    await assertIngestionQuota(ctx, user._id)
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
      throw appError("Paste some text before adding a source.")
    }

    if (text.length > LIMITS.maxPastedCharacters) {
      throw appError(
        `Pasted text can be at most ${LIMITS.maxPastedCharacters.toLocaleString()} characters.`,
      )
    }

    await assertIngestionQuota(ctx, user._id)

    const visible = await countVisibleSources(ctx, notebook._id)

    if (visible >= LIMITS.sourcesPerNotebook) {
      throw appError(
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
      throw appError("Enter a URL to add as a source.")
    }

    const validated = validatePublicHttpUrl(url)

    if (!validated.ok) {
      throw appError(validated.error)
    }

    await assertIngestionQuota(ctx, user._id)

    const visible = await countVisibleSources(ctx, notebook._id)

    if (visible >= LIMITS.sourcesPerNotebook) {
      throw appError(
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
      url: validated.url.toString(),
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
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user, notebook } = await requireNotebookOwner(ctx, args.notebookId)
    const filename = args.filename.trim()

    if (!filename) {
      throw appError("Choose a file before adding a source.")
    }

    if (!isAcceptedUpload(filename, args.mimeType)) {
      throw appError(describeRejectedFile(filename))
    }

    const metadata = await ctx.db.system.get("_storage", args.storageId)

    if (!metadata) {
      throw appError("The uploaded file is missing. Try uploading again.")
    }

    if (metadata.size > LIMITS.maxUploadBytes) {
      throw appError(
        `Files can be at most ${Math.round(LIMITS.maxUploadBytes / (1024 * 1024))} MB.`,
      )
    }

    if (
      metadata.contentType &&
      metadata.contentType !== "application/octet-stream" &&
      !isAcceptedUpload(filename, metadata.contentType)
    ) {
      throw appError(describeRejectedFile(filename))
    }

    await assertIngestionQuota(ctx, user._id)

    const visible = await countVisibleSources(ctx, notebook._id)

    if (visible >= LIMITS.sourcesPerNotebook) {
      throw appError(
        `Each notebook can hold up to ${LIMITS.sourcesPerNotebook} sources.`,
      )
    }

    const now = Date.now()
    const createdAt =
      typeof args.createdAt === "number" &&
      Number.isFinite(args.createdAt) &&
      args.createdAt <= now + 60_000
        ? args.createdAt
        : now
    const title = titleFromFilename(filename)
    const mimeType = args.mimeType || metadata.contentType || undefined

    const sourceId = await ctx.db.insert("sources", {
      ownerId: user._id,
      notebookId: notebook._id,
      kind: "file",
      title,
      originalTitle: title,
      filename,
      mimeType,
      originalStorageId: args.storageId,
      selected: true,
      processingState: "pending",
      createdAt,
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
      throw appError("Failed sources can't be used in chat. Retry them first.")
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
      const boundary = await applySourceSelectionBoundary(
        ctx,
        notebook,
        previousIds,
        nextIds,
      )
      await ctx.db.patch(notebook._id, {
        sourceRevision: boundary.sourceRevision,
        chatSelectionHash: boundary.chatSelectionHash,
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
      const boundary = await applySourceSelectionBoundary(
        ctx,
        notebook,
        previousIds,
        nextIds,
      )
      await ctx.db.patch(notebook._id, {
        sourceRevision: boundary.sourceRevision,
        chatSelectionHash: boundary.chatSelectionHash,
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
      const boundary = await applySourceSelectionBoundary(
        ctx,
        notebook,
        previousIds,
        nextIds,
      )
      await ctx.db.patch(notebook._id, {
        sourceRevision: boundary.sourceRevision,
        chatSelectionHash: boundary.chatSelectionHash,
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

    const generation = await scheduleNotebookTitleRefresh(ctx, notebook._id)

    return {
      notebookId: notebook._id,
      titleRefreshGeneration: generation,
    }
  },
})

export const retry = mutation({
  args: {
    sourceId: v.id("sources"),
  },
  handler: async (ctx, args) => {
    const { user, source } = await requireSourceOwner(ctx, args.sourceId)

    if (source.processingState !== "failed") {
      throw appError("Only failed sources can be retried.")
    }

    await assertIngestionQuota(ctx, user._id)
    await ctx.db.patch(source._id, {
      processingState: "pending",
      errorCode: undefined,
      digestStatus: undefined,
      digestText: undefined,
      digestCitations: undefined,
      updatedAt: Date.now(),
      selected: true,
    })
    await bumpUsage(ctx, user._id, "ingestions")
  },
})
