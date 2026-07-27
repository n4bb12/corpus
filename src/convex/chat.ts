import { v } from "convex/values"
import {
  canRetryLatestAssistant,
  hashSourceSelection,
  successfulPairsAfterBoundary,
} from "src/lib/chatHistory"
import { CHAT_PROGRESS } from "src/lib/chatProgress"
import { LIMITS } from "src/lib/limits"
import { quotaResetMessage, utcDateKey } from "src/lib/quotas"
import { mutation, query } from "./_generated/server"
import { requireNotebookOwner } from "./lib/ownership"

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const list = query({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    const { notebook } = await requireNotebookOwner(ctx, args.notebookId)
    const entries = await ctx.db
      .query("chatEntries")
      .withIndex("by_notebook_epoch_createdAt", (q) =>
        q.eq("notebookId", notebook._id).eq("chatEpoch", notebook.chatEpoch),
      )
      .collect()

    const withCitations = await Promise.all(
      entries.map(async (entry) => {
        if (entry.kind !== "message" || entry.role !== "assistant") {
          return { ...entry, citations: [] }
        }

        const citations = await ctx.db
          .query("citations")
          .withIndex("by_message_order", (q) => q.eq("messageId", entry._id))
          .collect()

        const enriched = await Promise.all(
          citations.map(async (citation) => {
            const source = citation.sourceId
              ? await ctx.db.get(citation.sourceId)
              : null

            return {
              ...citation,
              liveTitle:
                source && !source.deletedAt
                  ? source.title
                  : citation.sourceTitleSnapshot,
              canNavigate: Boolean(source && !source.deletedAt),
            }
          }),
        )

        return { ...entry, citations: enriched }
      }),
    )

    return withCitations
  },
})

export const prepareGeneration = mutation({
  args: {
    notebookId: v.id("notebooks"),
    prompt: v.string(),
    retryAssistantId: v.optional(v.id("chatEntries")),
  },
  handler: async (ctx, args) => {
    const { user, notebook } = await requireNotebookOwner(ctx, args.notebookId)
    const prompt = args.prompt.trim()

    if (!prompt) {
      throw new Error("Enter a question for your sources.")
    }

    if (prompt.length > LIMITS.maxPromptCharacters) {
      throw new Error(
        `Prompts can be at most ${LIMITS.maxPromptCharacters.toLocaleString()} characters.`,
      )
    }

    const dateKey = utcDateKey()
    const usage = await ctx.db
      .query("dailyUsage")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("dateKey", dateKey),
      )
      .unique()

    if ((usage?.generations ?? 0) >= LIMITS.generationsPerDay) {
      throw new Error(quotaResetMessage("generation", dateKey))
    }

    const entries = await ctx.db
      .query("chatEntries")
      .withIndex("by_notebook_epoch_createdAt", (q) =>
        q.eq("notebookId", notebook._id).eq("chatEpoch", notebook.chatEpoch),
      )
      .collect()

    const active = entries.some(
      (entry) =>
        entry.kind === "message" &&
        entry.role === "assistant" &&
        (entry.status === "pending" || entry.status === "streaming"),
    )

    if (active) {
      throw new Error("Wait for the current answer to finish.")
    }

    const sources = await ctx.db
      .query("sources")
      .withIndex("by_notebook_createdAt", (q) =>
        q.eq("notebookId", notebook._id),
      )
      .collect()

    const selectedReady = sources.filter(
      (source) =>
        !source.deletedAt &&
        source.selected &&
        source.processingState === "ready",
    )

    if (!selectedReady.length) {
      throw new Error(
        "Select at least one source that has finished processing.",
      )
    }

    const now = Date.now()
    const generationId = createId()
    let exchangeId = createId()
    let userMessageId
    let assistantMessageId

    if (args.retryAssistantId) {
      if (!canRetryLatestAssistant(entries)) {
        throw new Error(
          "You can only retry the latest failed or stopped answer.",
        )
      }

      const assistant = await ctx.db.get(args.retryAssistantId)

      if (
        !assistant ||
        assistant.notebookId !== notebook._id ||
        assistant.role !== "assistant"
      ) {
        throw new Error("That answer can't be retried anymore.")
      }

      exchangeId = assistant.exchangeId ?? exchangeId
      const user = entries.find(
        (entry) =>
          entry.kind === "message" &&
          entry.role === "user" &&
          entry.exchangeId === exchangeId,
      )

      if (!user) {
        throw new Error("That answer can't be retried anymore.")
      }

      userMessageId = user._id
      const oldCitations = await ctx.db
        .query("citations")
        .withIndex("by_message_order", (q) => q.eq("messageId", assistant._id))
        .collect()

      for (const citation of oldCitations) {
        await ctx.db.delete(citation._id)
      }

      await ctx.db.patch(assistant._id, {
        content: "",
        status: "pending",
        generationId,
        errorMessage: undefined,
        progressLabel: CHAT_PROGRESS.looking,
        sourceRevision: notebook.sourceRevision,
      })
      assistantMessageId = assistant._id
    } else {
      userMessageId = await ctx.db.insert("chatEntries", {
        notebookId: notebook._id,
        chatEpoch: notebook.chatEpoch,
        kind: "message",
        role: "user",
        content: prompt,
        status: "complete",
        sourceRevision: notebook.sourceRevision,
        exchangeId,
        generationId,
        createdAt: now,
      })

      assistantMessageId = await ctx.db.insert("chatEntries", {
        notebookId: notebook._id,
        chatEpoch: notebook.chatEpoch,
        kind: "message",
        role: "assistant",
        content: "",
        status: "pending",
        progressLabel: CHAT_PROGRESS.looking,
        sourceRevision: notebook.sourceRevision,
        exchangeId,
        generationId,
        createdAt: now + 1,
      })
    }

    if (!usage) {
      await ctx.db.insert("dailyUsage", {
        userId: user._id,
        dateKey,
        ingestions: 0,
        generations: 1,
      })
    } else {
      await ctx.db.patch(usage._id, {
        generations: usage.generations + 1,
      })
    }

    await ctx.db.patch(notebook._id, {
      chatSelectionHash: hashSourceSelection(
        selectedReady.map((source) => source._id),
      ),
      updatedAt: now,
      lastUsedAt: now,
    })

    const history = successfulPairsAfterBoundary(
      entries,
      LIMITS.chatHistoryPairs,
    )

    return {
      generationId,
      exchangeId,
      userMessageId,
      assistantMessageId,
      sourceRevision: notebook.sourceRevision,
      sourceIds: selectedReady.map((source) => source._id),
      prompt: args.retryAssistantId
        ? (entries.find(
            (entry) =>
              entry.kind === "message" &&
              entry.role === "user" &&
              entry.exchangeId === exchangeId,
          )?.content ?? prompt)
        : prompt,
      history,
    }
  },
})

export const setProgressLabel = mutation({
  args: {
    messageId: v.id("chatEntries"),
    generationId: v.string(),
    progressLabel: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)

    if (!message || message.generationId !== args.generationId) {
      return
    }

    if (message.status !== "pending" && message.status !== "streaming") {
      return
    }

    await requireNotebookOwner(ctx, message.notebookId)
    await ctx.db.patch(message._id, {
      progressLabel: args.progressLabel,
    })
  },
})

export const appendAssistantText = mutation({
  args: {
    messageId: v.id("chatEntries"),
    content: v.string(),
    generationId: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)

    if (!message || message.generationId !== args.generationId) {
      return
    }

    await requireNotebookOwner(ctx, message.notebookId)
    await ctx.db.patch(message._id, {
      content: args.content,
      status: "streaming",
      progressLabel: undefined,
    })
  },
})

export const finalizeAssistant = mutation({
  args: {
    messageId: v.id("chatEntries"),
    generationId: v.string(),
    content: v.string(),
    status: v.union(
      v.literal("complete"),
      v.literal("failed"),
      v.literal("canceled"),
    ),
    errorMessage: v.optional(v.string()),
    insufficient: v.optional(v.boolean()),
    citations: v.optional(
      v.array(
        v.object({
          sourceId: v.optional(v.id("sources")),
          chunkId: v.optional(v.id("chunks")),
          sourceTitleSnapshot: v.string(),
          excerpt: v.string(),
          locator: v.optional(
            v.object({
              startOffset: v.number(),
              endOffset: v.number(),
              ordinal: v.number(),
            }),
          ),
          order: v.number(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)

    if (!message || message.generationId !== args.generationId) {
      return
    }

    await requireNotebookOwner(ctx, message.notebookId)

    const existing = await ctx.db
      .query("citations")
      .withIndex("by_message_order", (q) => q.eq("messageId", message._id))
      .collect()

    for (const citation of existing) {
      await ctx.db.delete(citation._id)
    }

    for (const citation of args.citations ?? []) {
      await ctx.db.insert("citations", {
        messageId: message._id,
        ...citation,
      })
    }

    await ctx.db.patch(message._id, {
      content: args.content,
      status: args.status,
      errorMessage: args.errorMessage,
      insufficient: args.insufficient,
      progressLabel: undefined,
    })

    if (args.status === "complete") {
      const notebook = await ctx.db.get(message.notebookId)

      if (notebook) {
        const sources = await ctx.db
          .query("sources")
          .withIndex("by_notebook_createdAt", (q) =>
            q.eq("notebookId", notebook._id),
          )
          .collect()
        const selectedReadyIds = sources
          .filter(
            (source) =>
              !source.deletedAt &&
              source.selected &&
              source.processingState === "ready",
          )
          .map((source) => source._id)

        await ctx.db.patch(notebook._id, {
          chatSelectionHash: hashSourceSelection(selectedReadyIds),
          updatedAt: Date.now(),
        })
      }
    }
  },
})

export const cancelGeneration = mutation({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    const { notebook } = await requireNotebookOwner(ctx, args.notebookId)
    const entries = await ctx.db
      .query("chatEntries")
      .withIndex("by_notebook_epoch_createdAt", (q) =>
        q.eq("notebookId", notebook._id).eq("chatEpoch", notebook.chatEpoch),
      )
      .collect()

    const active = [...entries]
      .reverse()
      .find(
        (entry) =>
          entry.kind === "message" &&
          entry.role === "assistant" &&
          (entry.status === "pending" || entry.status === "streaming"),
      )

    if (!active) {
      return null
    }

    await ctx.db.patch(active._id, {
      status: "canceled",
      progressLabel: undefined,
    })

    return active.generationId ?? null
  },
})

export const failActiveGeneration = mutation({
  args: {
    notebookId: v.id("notebooks"),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { notebook } = await requireNotebookOwner(ctx, args.notebookId)
    const entries = await ctx.db
      .query("chatEntries")
      .withIndex("by_notebook_epoch_createdAt", (q) =>
        q.eq("notebookId", notebook._id).eq("chatEpoch", notebook.chatEpoch),
      )
      .collect()

    const active = [...entries]
      .reverse()
      .find(
        (entry) =>
          entry.kind === "message" &&
          entry.role === "assistant" &&
          (entry.status === "pending" || entry.status === "streaming"),
      )

    if (!active) {
      return null
    }

    await ctx.db.patch(active._id, {
      status: "failed",
      errorMessage:
        args.errorMessage ??
        "The answer stopped before it finished. Try again.",
      progressLabel: undefined,
    })

    return active._id
  },
})
