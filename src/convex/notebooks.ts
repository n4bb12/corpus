import { v } from "convex/values"
import { LIMITS, UNTITLED_NOTEBOOK } from "src/lib/limits"
import { normalizeTitle } from "src/lib/sourceTitle"
import { internal } from "./_generated/api"
import { mutation, query } from "./_generated/server"
import { requireNotebookOwner, requireUser } from "./lib/ownership"

function searchMatchesUntitled(search: string) {
  return UNTITLED_NOTEBOOK.toLowerCase().includes(search.toLowerCase())
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const limit = Math.min(
      args.limit ?? LIMITS.libraryPageSize,
      LIMITS.libraryPageSize,
    )
    const search = args.search?.trim()

    if (search) {
      const results = await ctx.db
        .query("notebooks")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("ownerId", user._id),
        )
        .take(limit + 1)

      const byId = new Map(
        results
          .filter((notebook) => !notebook.deletedAt)
          .map((notebook) => [notebook._id, notebook]),
      )

      if (searchMatchesUntitled(search)) {
        const untitled = await ctx.db
          .query("notebooks")
          .withIndex("by_owner_title", (q) =>
            q.eq("ownerId", user._id).eq("title", ""),
          )
          .collect()

        for (const notebook of untitled) {
          if (!notebook.deletedAt) {
            byId.set(notebook._id, notebook)
          }
        }
      }

      const visible = [...byId.values()].sort(
        (left, right) => right.lastUsedAt - left.lastUsedAt,
      )
      const page = visible.slice(0, limit)
      const hasMore = visible.length > limit
      const enriched = await Promise.all(
        page.map(async (notebook) => {
          const sources = await ctx.db
            .query("sources")
            .withIndex("by_notebook_createdAt", (q) =>
              q.eq("notebookId", notebook._id),
            )
            .collect()

          return {
            ...notebook,
            sourceCount: sources.filter((source) => !source.deletedAt).length,
          }
        }),
      )

      return {
        page: enriched,
        continueCursor: hasMore ? page.at(-1)?._id : null,
        isDone: !hasMore,
      }
    }

    const all = await ctx.db
      .query("notebooks")
      .withIndex("by_owner_lastUsedAt", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect()

    const visible = all.filter((notebook) => !notebook.deletedAt)
    let start = 0

    if (args.cursor) {
      const index = visible.findIndex(
        (notebook) => notebook._id === args.cursor,
      )
      start = index >= 0 ? index + 1 : 0
    }

    const page = visible.slice(start, start + limit)
    const enriched = await Promise.all(
      page.map(async (notebook) => {
        const sources = await ctx.db
          .query("sources")
          .withIndex("by_notebook_createdAt", (q) =>
            q.eq("notebookId", notebook._id),
          )
          .collect()

        return {
          ...notebook,
          sourceCount: sources.filter((source) => !source.deletedAt).length,
        }
      }),
    )

    const isDone = start + limit >= visible.length

    return {
      page: enriched,
      continueCursor: isDone ? null : (page.at(-1)?._id ?? null),
      isDone,
    }
  },
})

export const get = query({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    const { notebook } = await requireNotebookOwner(ctx, args.notebookId)
    return notebook
  },
})

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const existing = await ctx.db
      .query("notebooks")
      .withIndex("by_owner_lastUsedAt", (q) => q.eq("ownerId", user._id))
      .collect()

    const count = existing.filter((notebook) => !notebook.deletedAt).length

    if (count >= LIMITS.notebooksPerAccount) {
      throw new Error(
        `You can keep up to ${LIMITS.notebooksPerAccount} notebooks per account.`,
      )
    }

    const now = Date.now()

    return await ctx.db.insert("notebooks", {
      ownerId: user._id,
      title: "",
      titleOrigin: "placeholder",
      titleGenerationState: "idle",
      chatEpoch: 0,
      sourceRevision: 0,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
    })
  },
})

export const rename = mutation({
  args: {
    notebookId: v.id("notebooks"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { notebook } = await requireNotebookOwner(ctx, args.notebookId)
    const title = normalizeTitle(args.title, "")
    const now = Date.now()

    await ctx.db.patch(notebook._id, {
      title,
      titleOrigin: "manual",
      titleGenerationState: "complete",
      updatedAt: now,
      lastUsedAt: now,
    })
  },
})

export const touch = mutation({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    const { notebook } = await requireNotebookOwner(ctx, args.notebookId)
    await ctx.db.patch(notebook._id, {
      lastUsedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    const { notebook } = await requireNotebookOwner(ctx, args.notebookId)
    const now = Date.now()

    await ctx.db.patch(notebook._id, {
      deletedAt: now,
      updatedAt: now,
    })

    await ctx.scheduler.runAfter(0, internal.cleanup.deleteNotebookBatch, {
      notebookId: notebook._id,
      cursor: null,
    })
  },
})

export const clearChat = mutation({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    const { notebook } = await requireNotebookOwner(ctx, args.notebookId)
    const now = Date.now()
    const nextEpoch = notebook.chatEpoch + 1

    await ctx.db.patch(notebook._id, {
      chatEpoch: nextEpoch,
      chatSelectionHash: undefined,
      updatedAt: now,
      lastUsedAt: now,
    })

    await ctx.scheduler.runAfter(0, internal.cleanup.deleteChatEpochBatch, {
      notebookId: notebook._id,
      chatEpoch: notebook.chatEpoch,
      cursor: null,
    })
  },
})
