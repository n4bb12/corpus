import { v } from "convex/values"
import {
  canApplyGeneratedTitle,
  isStaleTitleRefresh,
  shouldSkipTitleRefresh,
} from "src/lib/notebookTitlePolicy"
import { internalMutation, internalQuery } from "./_generated/server"

export const getNotebook = internalQuery({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.notebookId)
  },
})

/** Sources with title evidence — including digest drafts produced while indexing. */
export const listReadySourcesForTitle = internalQuery({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_notebook_createdAt", (q) =>
        q.eq("notebookId", args.notebookId),
      )
      .collect()

    return sources.filter((source) => {
      if (source.deletedAt || source.processingState === "failed") {
        return false
      }

      const hasDigest =
        (source.digestStatus === "pending" ||
          source.digestStatus === "ready") &&
        typeof source.digestText === "string" &&
        !!source.digestText.trim()

      if (hasDigest) {
        return true
      }

      return source.processingState === "ready" && !!source.normalizedStorageId
    })
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

    if (!notebook || shouldSkipTitleRefresh(notebook.titleOrigin)) {
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
    sourceIds: v.array(v.id("sources")),
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.db.get(args.notebookId)

    if (!notebook || !canApplyGeneratedTitle(notebook.titleOrigin)) {
      return
    }

    for (const sourceId of args.sourceIds) {
      const source = await ctx.db.get(sourceId)

      if (!source || source.deletedAt || source.processingState === "failed") {
        return
      }
    }

    await ctx.db.patch(args.notebookId, {
      title: args.title,
      titleOrigin: "generated",
      titleGenerationState: "complete",
      updatedAt: Date.now(),
    })
  },
})

export const clearAutomaticTitle = internalMutation({
  args: {
    notebookId: v.id("notebooks"),
    generation: v.number(),
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.db.get(args.notebookId)

    if (
      !notebook ||
      !canApplyGeneratedTitle(notebook.titleOrigin) ||
      isStaleTitleRefresh(notebook.titleRefreshGeneration, args.generation)
    ) {
      return
    }

    await ctx.db.patch(args.notebookId, {
      title: "",
      titleOrigin: "placeholder",
      titleGenerationState: "idle",
      updatedAt: Date.now(),
    })
  },
})
