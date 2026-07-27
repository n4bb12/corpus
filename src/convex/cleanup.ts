import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalMutation } from "./_generated/server"

const BATCH = 25

export const deleteNotebookBatch = internalMutation({
  args: {
    notebookId: v.id("notebooks"),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_notebook_createdAt", (q) =>
        q.eq("notebookId", args.notebookId),
      )
      .take(BATCH)

    if (sources.length) {
      for (const source of sources) {
        await ctx.db.patch(source._id, {
          deletedAt: source.deletedAt ?? Date.now(),
          selected: false,
        })
        await ctx.scheduler.runAfter(0, internal.cleanup.deleteSourceBatch, {
          sourceId: source._id,
          cursor: null,
        })
      }

      await ctx.scheduler.runAfter(0, internal.cleanup.deleteNotebookBatch, {
        notebookId: args.notebookId,
        cursor: null,
      })
      return
    }

    const entries = await ctx.db
      .query("chatEntries")
      .withIndex("by_notebook_epoch_createdAt", (q) =>
        q.eq("notebookId", args.notebookId),
      )
      .take(BATCH)

    if (entries.length) {
      for (const entry of entries) {
        if (entry.kind === "message" && entry.role === "assistant") {
          const citations = await ctx.db
            .query("citations")
            .withIndex("by_message_order", (q) => q.eq("messageId", entry._id))
            .collect()

          for (const citation of citations) {
            await ctx.db.delete(citation._id)
          }
        }

        await ctx.db.delete(entry._id)
      }

      await ctx.scheduler.runAfter(0, internal.cleanup.deleteNotebookBatch, {
        notebookId: args.notebookId,
        cursor: null,
      })
      return
    }

    const notebook = await ctx.db.get(args.notebookId)

    if (notebook) {
      await ctx.db.delete(notebook._id)
    }
  },
})

export const deleteSourceBatch = internalMutation({
  args: {
    sourceId: v.id("sources"),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId)

    if (!source) {
      return
    }

    const chunks = await ctx.db
      .query("chunks")
      .withIndex("by_source_ordinal", (q) => q.eq("sourceId", args.sourceId))
      .take(BATCH)

    if (chunks.length) {
      for (const chunk of chunks) {
        await ctx.db.delete(chunk._id)
      }

      await ctx.scheduler.runAfter(0, internal.cleanup.deleteSourceBatch, {
        sourceId: args.sourceId,
        cursor: null,
      })
      return
    }

    if (source.originalStorageId) {
      try {
        await ctx.storage.delete(source.originalStorageId)
      } catch {
        // already deleted
      }
    }

    if (source.normalizedStorageId) {
      try {
        await ctx.storage.delete(source.normalizedStorageId)
      } catch {
        // already deleted
      }
    }

    await ctx.db.delete(source._id)
  },
})

export const deleteChatEpochBatch = internalMutation({
  args: {
    notebookId: v.id("notebooks"),
    chatEpoch: v.number(),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("chatEntries")
      .withIndex("by_notebook_epoch_createdAt", (q) =>
        q.eq("notebookId", args.notebookId).eq("chatEpoch", args.chatEpoch),
      )
      .take(BATCH)

    if (!entries.length) {
      return
    }

    for (const entry of entries) {
      if (entry.kind === "message" && entry.role === "assistant") {
        const citations = await ctx.db
          .query("citations")
          .withIndex("by_message_order", (q) => q.eq("messageId", entry._id))
          .collect()

        for (const citation of citations) {
          await ctx.db.delete(citation._id)
        }
      }

      await ctx.db.delete(entry._id)
    }

    await ctx.scheduler.runAfter(0, internal.cleanup.deleteChatEpochBatch, {
      notebookId: args.notebookId,
      chatEpoch: args.chatEpoch,
      cursor: null,
    })
  },
})
