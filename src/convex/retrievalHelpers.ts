import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { internalAction, internalQuery } from "./_generated/server"

type VectorHit = {
  chunkId: Id<"chunks">
  sourceId: Id<"sources">
  text: string
  score: number
  startOffset: number
  endOffset: number
  ordinal: number
}

export const listSourceCharacterCounts = internalQuery({
  args: {
    notebookId: v.id("notebooks"),
    sourceIds: v.array(v.id("sources")),
  },
  handler: async (ctx, args) => {
    const counts: Array<number | undefined> = []

    for (const sourceId of args.sourceIds) {
      const source = await ctx.db.get(sourceId)

      if (
        !source ||
        source.deletedAt ||
        source.notebookId !== args.notebookId
      ) {
        continue
      }

      counts.push(source.characterCount)
    }

    return counts
  },
})

export const listChunksForSources = internalQuery({
  args: {
    notebookId: v.id("notebooks"),
    sourceIds: v.array(v.id("sources")),
    maxChunksPerSource: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const chunks: Array<{
      chunkId: Id<"chunks">
      sourceId: Id<"sources">
      text: string
      startOffset: number
      endOffset: number
      ordinal: number
    }> = []

    const perSourceLimit =
      typeof args.maxChunksPerSource === "number" && args.maxChunksPerSource > 0
        ? args.maxChunksPerSource
        : null

    for (const sourceId of args.sourceIds) {
      const query = ctx.db
        .query("chunks")
        .withIndex("by_source_ordinal", (q) => q.eq("sourceId", sourceId))

      const sourceChunks = perSourceLimit
        ? await query.take(perSourceLimit)
        : await query.collect()

      for (const chunk of sourceChunks) {
        if (chunk.deletedAt || chunk.notebookId !== args.notebookId) {
          continue
        }

        chunks.push({
          chunkId: chunk._id,
          sourceId: chunk.sourceId,
          text: chunk.text,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          ordinal: chunk.ordinal,
        })
      }
    }

    return chunks
  },
})

export const searchText = internalQuery({
  args: {
    notebookId: v.id("notebooks"),
    sourceIds: v.array(v.id("sources")),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const sourceSet = new Set(args.sourceIds.map(String))
    const hits = await ctx.db
      .query("chunks")
      .withSearchIndex("search_text", (q) =>
        q
          .search("searchableText", args.prompt)
          .eq("notebookId", args.notebookId),
      )
      .take(24)

    return hits
      .filter((hit) => sourceSet.has(String(hit.sourceId)) && !hit.deletedAt)
      .map((hit, index) => ({
        chunkId: hit._id,
        sourceId: hit.sourceId,
        text: hit.text,
        score: 1 / (index + 1),
        startOffset: hit.startOffset,
        endOffset: hit.endOffset,
        ordinal: hit.ordinal,
      }))
  },
})

export const getChunk = internalQuery({
  args: {
    chunkId: v.id("chunks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chunkId)
  },
})

export const searchVectors = internalAction({
  args: {
    notebookId: v.id("notebooks"),
    sourceIds: v.array(v.id("sources")),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args): Promise<VectorHit[]> => {
    const results: Array<{ chunkId: Id<"chunks">; score: number }> = []

    for (const sourceId of args.sourceIds) {
      const hits = await ctx.vectorSearch("chunks", "by_embedding", {
        vector: args.embedding,
        limit: 8,
        filter: (q) => q.eq("sourceId", sourceId),
      })

      for (const hit of hits) {
        results.push({
          chunkId: hit._id,
          score: hit._score,
        })
      }
    }

    const enriched: VectorHit[] = []

    for (const hit of results) {
      const chunk = await ctx.runQuery(internal.retrievalHelpers.getChunk, {
        chunkId: hit.chunkId,
      })

      if (!chunk || chunk.deletedAt) {
        continue
      }

      if (chunk.notebookId !== args.notebookId) {
        continue
      }

      enriched.push({
        chunkId: chunk._id,
        sourceId: chunk.sourceId,
        text: chunk.text,
        score: hit.score,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        ordinal: chunk.ordinal,
      })
    }

    return enriched.sort((a, b) => b.score - a.score).slice(0, 24)
  },
})
