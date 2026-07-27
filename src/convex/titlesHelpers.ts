import { v } from "convex/values"
import {
  canApplyGeneratedTitle,
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

/** Ready sources for titling — digests preferred, markdown used when missing. */
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

    return sources.filter(
      (source) =>
        !source.deletedAt &&
        source.processingState === "ready" &&
        (!!source.normalizedStorageId ||
          (source.digestStatus === "ready" &&
            typeof source.digestText === "string" &&
            !!source.digestText.trim())),
    )
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
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.db.get(args.notebookId)

    if (!notebook || !canApplyGeneratedTitle(notebook.titleOrigin)) {
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
