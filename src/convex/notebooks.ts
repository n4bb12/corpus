import { v } from "convex/values"
import {
  clampLibraryPage,
  libraryBrowseLimit,
  libraryBrowseOffset,
  libraryBrowsePageCount,
  librarySearchOffset,
  librarySearchPageCount,
} from "src/lib/libraryPagination"
import { LIMITS } from "src/lib/limits"
import { notebookMatchesSearch } from "src/lib/notebookSearch"
import {
  patchForClearedNotebookTitle,
  TITLE_REFRESH_DEBOUNCE_MS,
} from "src/lib/notebookTitlePolicy"
import { normalizeTitle } from "src/lib/sourceTitle"
import { internal } from "./_generated/api"
import { mutation, query } from "./_generated/server"
import {
  getUserOrNull,
  requireNotebookOwner,
  requireUser,
} from "./lib/ownership"

export const list = query({
  args: {
    search: v.optional(v.string()),
    page: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserOrNull(ctx)

    // Sign-out can clear the session while a watch is still draining — return
    // empty instead of throwing so the client does not log a Server Error.
    if (!user) {
      return {
        page: [],
        pageIndex: 1,
        pageCount: 0,
        totalCount: 0,
        isDone: true,
      }
    }

    const requestedPage =
      typeof args.page === "number" && args.page > 0 ? Math.floor(args.page) : 1
    const search = args.search?.trim()

    if (search) {
      const all = await ctx.db
        .query("notebooks")
        .withIndex("by_owner_lastUsedAt", (q) => q.eq("ownerId", user._id))
        .order("desc")
        .collect()

      const visible = all.filter(
        (notebook) =>
          !notebook.deletedAt && notebookMatchesSearch(notebook.title, search),
      )
      const totalCount = visible.length
      const pageCount = librarySearchPageCount(totalCount)
      const pageIndex = clampLibraryPage(requestedPage, pageCount)
      const start = librarySearchOffset(pageIndex)
      const page = visible.slice(start, start + LIMITS.libraryPageSize)
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
        pageIndex,
        pageCount,
        totalCount,
        isDone: pageIndex >= pageCount,
      }
    }

    const all = await ctx.db
      .query("notebooks")
      .withIndex("by_owner_lastUsedAt", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect()

    const visible = all.filter((notebook) => !notebook.deletedAt)
    const totalCount = visible.length
    const pageCount = libraryBrowsePageCount(totalCount)
    const pageIndex = clampLibraryPage(requestedPage, pageCount)
    const start = libraryBrowseOffset(pageIndex)
    const limit = libraryBrowseLimit(pageIndex)
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

    return {
      page: enriched,
      pageIndex,
      pageCount,
      totalCount,
      isDone: pageIndex >= pageCount,
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

    if (!title) {
      const cleared = patchForClearedNotebookTitle()
      const generation = (notebook.titleRefreshGeneration ?? 0) + 1

      await ctx.db.patch(notebook._id, {
        ...cleared,
        titleRefreshGeneration: generation,
        updatedAt: now,
        lastUsedAt: now,
      })

      await ctx.scheduler.runAfter(
        TITLE_REFRESH_DEBOUNCE_MS,
        internal.titles.refreshNotebookTitle,
        {
          notebookId: notebook._id,
          generation,
        },
      )

      return
    }

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
