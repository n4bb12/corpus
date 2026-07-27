import { v } from "convex/values"
import {
  shouldSkipTitleRefresh,
  TITLE_REFRESH_DEBOUNCE_MS,
} from "src/lib/notebookTitlePolicy"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { type MutationCtx, mutation } from "./_generated/server"
import { requireSourceOwner } from "./lib/ownership"

async function scheduleNotebookTitleRefresh(
  ctx: MutationCtx,
  notebookId: Id<"notebooks">,
) {
  const notebook = await ctx.db.get(notebookId)

  if (!notebook || shouldSkipTitleRefresh(notebook.titleOrigin)) {
    return
  }

  const generation = (notebook.titleRefreshGeneration ?? 0) + 1

  await ctx.db.patch(notebook._id, {
    titleRefreshGeneration: generation,
    titleGenerationState: "pending",
    updatedAt: Date.now(),
  })

  await ctx.scheduler.runAfter(
    TITLE_REFRESH_DEBOUNCE_MS,
    internal.titles.refreshNotebookTitle,
    {
      notebookId,
      generation,
    },
  )
}

const processingState = v.union(
  v.literal("pending"),
  v.literal("extracting"),
  v.literal("chunking"),
  v.literal("embedding"),
  v.literal("summarizing"),
  v.literal("ready"),
  v.literal("failed"),
)

const digestCitation = v.object({
  chunkId: v.id("chunks"),
  quote: v.string(),
  locator: v.optional(
    v.object({
      startOffset: v.number(),
      endOffset: v.number(),
      ordinal: v.number(),
    }),
  ),
})

export const setProcessingState = mutation({
  args: {
    sourceId: v.id("sources"),
    processingState,
  },
  handler: async (ctx, args) => {
    await requireSourceOwner(ctx, args.sourceId)
    await ctx.db.patch(args.sourceId, {
      processingState: args.processingState,
      updatedAt: Date.now(),
    })
  },
})

export const setExtracted = mutation({
  args: {
    sourceId: v.id("sources"),
    title: v.string(),
    normalizedStorageId: v.id("_storage"),
    characterCount: v.number(),
  },
  handler: async (ctx, args) => {
    await requireSourceOwner(ctx, args.sourceId)

    await ctx.db.patch(args.sourceId, {
      title: args.title,
      normalizedStorageId: args.normalizedStorageId,
      characterCount: args.characterCount,
      updatedAt: Date.now(),
    })
  },
})

export const replaceChunks = mutation({
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
    const { source } = await requireSourceOwner(ctx, args.sourceId)
    const existing = await ctx.db
      .query("chunks")
      .withIndex("by_source_ordinal", (q) => q.eq("sourceId", args.sourceId))
      .collect()

    for (const chunk of existing) {
      await ctx.db.delete(chunk._id)
    }

    const inserted: Array<{
      chunkId: Id<"chunks">
      text: string
      ordinal: number
      startOffset: number
      endOffset: number
    }> = []

    for (const chunk of args.chunks) {
      const chunkId = await ctx.db.insert("chunks", {
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

      inserted.push({
        chunkId,
        text: chunk.text,
        ordinal: chunk.ordinal,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
      })
    }

    return inserted
  },
})

export const setDigest = mutation({
  args: {
    sourceId: v.id("sources"),
    digestStatus: v.union(v.literal("ready"), v.literal("failed")),
    digestText: v.optional(v.string()),
    digestCitations: v.optional(v.array(digestCitation)),
  },
  handler: async (ctx, args) => {
    await requireSourceOwner(ctx, args.sourceId)

    if (args.digestStatus === "ready" && args.digestText) {
      await ctx.db.patch(args.sourceId, {
        digestStatus: "ready",
        digestText: args.digestText,
        digestCitations: args.digestCitations ?? [],
        updatedAt: Date.now(),
      })
      return
    }

    await ctx.db.patch(args.sourceId, {
      digestStatus: "failed",
      digestText: undefined,
      digestCitations: undefined,
      updatedAt: Date.now(),
    })
  },
})

export const setDigestDraft = mutation({
  args: {
    sourceId: v.id("sources"),
    digestText: v.string(),
  },
  handler: async (ctx, args) => {
    const { source } = await requireSourceOwner(ctx, args.sourceId)

    if (source.deletedAt || source.processingState === "failed") {
      return
    }

    await ctx.db.patch(source._id, {
      digestStatus: "pending",
      digestText: args.digestText,
      digestCitations: undefined,
      updatedAt: Date.now(),
    })

    await scheduleNotebookTitleRefresh(ctx, source.notebookId)
  },
})

export const markReady = mutation({
  args: {
    sourceId: v.id("sources"),
  },
  handler: async (ctx, args) => {
    const { source } = await requireSourceOwner(ctx, args.sourceId)

    await ctx.db.patch(source._id, {
      processingState: "ready",
      errorCode: undefined,
      updatedAt: Date.now(),
    })

    if (source.selected) {
      await ctx.scheduler.runAfter(
        0,
        internal.sourceRevisions.markReadySelectedRevision,
        {
          sourceId: source._id,
        },
      )
    }

    await scheduleNotebookTitleRefresh(ctx, source.notebookId)
  },
})

export const markFailed = mutation({
  args: {
    sourceId: v.id("sources"),
    errorCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { source } = await requireSourceOwner(ctx, args.sourceId)

    await ctx.db.patch(source._id, {
      processingState: "failed",
      selected: false,
      errorCode: args.errorCode,
      updatedAt: Date.now(),
    })

    await scheduleNotebookTitleRefresh(ctx, source.notebookId)
  },
})
