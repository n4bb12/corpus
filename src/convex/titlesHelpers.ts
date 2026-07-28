import { v } from "convex/values"
import {
  canApplyGeneratedTitle,
  isStaleTitleRefresh,
  shouldSkipTitleRefresh,
} from "src/lib/notebookTitlePolicy"
import { mutation, query } from "./_generated/server"
import { requireNotebookOwner } from "./lib/ownership"

export const getNotebook = query({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    const { notebook } = await requireNotebookOwner(ctx, args.notebookId)

    return notebook
  },
})

/** Sources with title evidence — including digest drafts produced while indexing. */
export const listReadySourcesForTitle = query({
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

export const setTitleState = mutation({
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
    const { notebook } = await requireNotebookOwner(ctx, args.notebookId)

    if (shouldSkipTitleRefresh(notebook.titleOrigin)) {
      return
    }

    await ctx.db.patch(args.notebookId, {
      titleGenerationState: args.titleGenerationState,
      updatedAt: Date.now(),
    })
  },
})

export const applyGeneratedTitle = mutation({
  args: {
    notebookId: v.id("notebooks"),
    title: v.string(),
    sourceIds: v.array(v.id("sources")),
  },
  handler: async (ctx, args) => {
    const { notebook } = await requireNotebookOwner(ctx, args.notebookId)

    if (!canApplyGeneratedTitle(notebook.titleOrigin)) {
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

export const clearAutomaticTitle = mutation({
  args: {
    notebookId: v.id("notebooks"),
    generation: v.number(),
  },
  handler: async (ctx, args) => {
    const { notebook } = await requireNotebookOwner(ctx, args.notebookId)

    if (
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
