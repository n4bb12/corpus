import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const processingState = v.union(
  v.literal("pending"),
  v.literal("extracting"),
  v.literal("chunking"),
  v.literal("embedding"),
  v.literal("ready"),
  v.literal("failed"),
)

export const sourceKind = v.union(
  v.literal("url"),
  v.literal("file"),
  v.literal("text"),
)

export const titleOrigin = v.union(
  v.literal("placeholder"),
  v.literal("generated"),
  v.literal("manual"),
)

export const titleGenerationState = v.union(
  v.literal("idle"),
  v.literal("pending"),
  v.literal("complete"),
  v.literal("failed"),
)

export const chatEntryKind = v.union(
  v.literal("message"),
  v.literal("sourceBoundary"),
)

export const chatRole = v.union(v.literal("user"), v.literal("assistant"))

export const generationStatus = v.union(
  v.literal("pending"),
  v.literal("streaming"),
  v.literal("complete"),
  v.literal("failed"),
  v.literal("canceled"),
)

export default defineSchema({
  notebooks: defineTable({
    ownerId: v.string(),
    title: v.string(),
    titleOrigin: titleOrigin,
    titleGenerationState: titleGenerationState,
    chatEpoch: v.number(),
    sourceRevision: v.number(),
    chatSelectionHash: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastUsedAt: v.number(),
  })
    .index("by_owner_lastUsedAt", ["ownerId", "lastUsedAt"])
    .index("by_owner_title", ["ownerId", "title"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["ownerId"],
    }),

  sources: defineTable({
    ownerId: v.string(),
    notebookId: v.id("notebooks"),
    kind: sourceKind,
    title: v.string(),
    originalTitle: v.string(),
    url: v.optional(v.string()),
    filename: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    originalStorageId: v.optional(v.id("_storage")),
    normalizedStorageId: v.optional(v.id("_storage")),
    textContent: v.optional(v.string()),
    selected: v.boolean(),
    processingState: processingState,
    errorCode: v.optional(v.string()),
    characterCount: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_notebook_createdAt", ["notebookId", "createdAt"])
    .index("by_notebook_selected", ["notebookId", "selected"])
    .index("by_owner", ["ownerId"]),

  chunks: defineTable({
    ownerId: v.string(),
    notebookId: v.id("notebooks"),
    sourceId: v.id("sources"),
    text: v.string(),
    searchableText: v.string(),
    ordinal: v.number(),
    startOffset: v.number(),
    endOffset: v.number(),
    embedding: v.optional(v.array(v.float64())),
    deletedAt: v.optional(v.number()),
  })
    .index("by_source_ordinal", ["sourceId", "ordinal"])
    .index("by_notebook", ["notebookId"])
    .searchIndex("search_text", {
      searchField: "searchableText",
      filterFields: ["notebookId", "sourceId"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1024,
      filterFields: ["sourceId", "notebookId"],
    }),

  chatEntries: defineTable({
    notebookId: v.id("notebooks"),
    chatEpoch: v.number(),
    kind: chatEntryKind,
    role: v.optional(chatRole),
    content: v.optional(v.string()),
    status: v.optional(generationStatus),
    insufficient: v.optional(v.boolean()),
    sourceRevision: v.optional(v.number()),
    selectionHash: v.optional(v.string()),
    activeSourceCount: v.optional(v.number()),
    exchangeId: v.optional(v.string()),
    generationId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    progressLabel: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_notebook_epoch_createdAt", [
    "notebookId",
    "chatEpoch",
    "createdAt",
  ]),

  citations: defineTable({
    messageId: v.id("chatEntries"),
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
  }).index("by_message_order", ["messageId", "order"]),

  dailyUsage: defineTable({
    userId: v.string(),
    dateKey: v.string(),
    ingestions: v.number(),
    generations: v.number(),
  }).index("by_user_date", ["userId", "dateKey"]),
})
