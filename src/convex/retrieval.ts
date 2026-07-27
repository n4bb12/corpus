"use node"

import { createOpenAI } from "@ai-sdk/openai"
import { voyage } from "@ai-sdk/voyage"
import { embed, generateText, Output, rerank } from "ai"
import { v } from "convex/values"
import { CHAT_PROGRESS } from "src/lib/chatProgress"
import { requireEnv } from "src/lib/env"
import { MODELS } from "src/lib/limits"
import {
  EVIDENCE_CHARACTER_BUDGET,
  maxChunksPerSourceForBudget,
  mergeRetrievalCandidates,
  packCoverageEvidence,
  type RetrievalCandidate,
  selectEvidenceWithinBudget,
  sourcesExceedEvidenceBudget,
  tryPackInlineEvidence,
} from "src/lib/retrieval"
import { type DigestSection, isCorpusSummaryPrompt } from "src/lib/sourceDigest"
import { generateSourceDigest } from "src/server/sources/generateSourceDigest"
import { z } from "zod"
import { api, internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { type ActionCtx, action } from "./_generated/server"
import { authComponent } from "./auth"

type ListedChunk = {
  chunkId: Id<"chunks">
  sourceId: Id<"sources">
  text: string
  startOffset: number
  endOffset: number
  ordinal: number
}

type SourceDigestRow = {
  sourceId: Id<"sources">
  title: string
  digestStatus?: "pending" | "ready" | "failed"
  digestText?: string
  digestCitations?: Array<{
    chunkId: Id<"chunks">
    quote: string
    locator?: {
      startOffset: number
      endOffset: number
      ordinal: number
    }
  }>
  normalizedStorageId?: Id<"_storage">
}

const classifySchema = z.object({
  mode: z.enum(["factual", "corpus"]),
})

async function classifyPromptMode(prompt: string) {
  try {
    const openai = createOpenAI({
      apiKey: requireEnv("OPENAI_API_KEY"),
    })

    const result = await generateText({
      model: openai(MODELS.classify),
      system: `Classify the user question for a multi-source notebook assistant.
Return mode "corpus" when the question is a cross-cutting task over the selected sources as a whole: summarize, brief, overview, themes, compare, contrast, or find agreements/contradictions across sources.
Return mode "factual" when the question seeks specific content, claims, quotes, or details that retrieval should find by similarity.
When unsure, prefer "factual".`,
      prompt,
      output: Output.object({ schema: classifySchema }),
    })

    if (result.output?.mode === "corpus" || result.output?.mode === "factual") {
      return result.output.mode
    }
  } catch {
    // Fall through to factual.
  }

  return "factual" as const
}

async function backfillSourceDigest(
  ctx: ActionCtx,
  source: SourceDigestRow,
  notebookId: Id<"notebooks">,
) {
  if (!source.normalizedStorageId) {
    return null
  }

  try {
    const blob = await ctx.storage.get(source.normalizedStorageId)

    if (!blob) {
      return null
    }

    const markdown = await blob.text()
    const chunks = await ctx.runQuery(
      internal.retrievalHelpers.listChunksForSources,
      {
        notebookId,
        sourceIds: [source.sourceId],
        maxChunksPerSource: 40,
      },
    )

    if (!chunks.length || !markdown.trim()) {
      return null
    }

    const digest = await generateSourceDigest({
      sourceTitle: source.title,
      markdown,
      chunks: chunks.map((chunk) => ({
        chunkId: String(chunk.chunkId),
        text: chunk.text,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        ordinal: chunk.ordinal,
      })),
    })

    if (!digest) {
      await ctx.runMutation(api.ingestion.setDigest, {
        sourceId: source.sourceId,
        digestStatus: "failed",
      })
      return null
    }

    const citations = digest.citations.flatMap((citation) => {
      const chunk = chunks.find(
        (entry) => String(entry.chunkId) === citation.chunkId,
      )

      if (!chunk) {
        return []
      }

      return [
        {
          chunkId: chunk.chunkId,
          quote: citation.quote,
          locator: citation.locator,
        },
      ]
    })

    await ctx.runMutation(api.ingestion.setDigest, {
      sourceId: source.sourceId,
      digestStatus: "ready",
      digestText: digest.digestText,
      digestCitations: citations,
    })

    return {
      sourceId: source.sourceId,
      title: source.title,
      digestStatus: "ready" as const,
      digestText: digest.digestText,
      digestCitations: citations,
      normalizedStorageId: source.normalizedStorageId,
    } satisfies SourceDigestRow
  } catch {
    try {
      await ctx.runMutation(api.ingestion.setDigest, {
        sourceId: source.sourceId,
        digestStatus: "failed",
      })
    } catch {
      // Ignore persistence failures during backfill.
    }

    return null
  }
}

async function buildDigestEvidencePack(
  ctx: ActionCtx,
  notebookId: Id<"notebooks">,
  sourceIds: Id<"sources">[],
  prompt: string,
) {
  let rows = await ctx.runQuery(internal.retrievalHelpers.listSourceDigests, {
    notebookId,
    sourceIds,
  })

  const missing = rows.filter(
    (row) =>
      row.digestStatus !== "ready" ||
      typeof row.digestText !== "string" ||
      !row.digestText.trim(),
  )

  if (missing.length && isCorpusSummaryPrompt(prompt)) {
    const filled: SourceDigestRow[] = []

    for (const row of missing) {
      if (row.digestStatus === "failed") {
        continue
      }

      const backfilled = await backfillSourceDigest(ctx, row, notebookId)

      if (backfilled) {
        filled.push(backfilled)
      }
    }

    if (filled.length) {
      const byId = new Map(rows.map((row) => [String(row.sourceId), row]))

      for (const row of filled) {
        byId.set(String(row.sourceId), row)
      }

      rows = [...byId.values()]
    }
  }

  const ready = rows.filter(
    (row) =>
      row.digestStatus === "ready" &&
      typeof row.digestText === "string" &&
      !!row.digestText.trim(),
  )

  if (!ready.length) {
    return null
  }

  const citationIds: Id<"chunks">[] = []
  const seenCitation = new Set<string>()

  for (const row of ready) {
    for (const citation of row.digestCitations ?? []) {
      const key = String(citation.chunkId)

      if (seenCitation.has(key)) {
        continue
      }

      seenCitation.add(key)
      citationIds.push(citation.chunkId)
    }
  }

  const chunks = citationIds.length
    ? await ctx.runQuery(internal.retrievalHelpers.getChunksByIds, {
        chunkIds: citationIds,
      })
    : []
  const chunkById = new Map(
    chunks.map((chunk) => [String(chunk.chunkId), chunk]),
  )

  const sections: DigestSection[] = ready.map((row) => ({
    sourceId: String(row.sourceId),
    title: row.title,
    digestText: row.digestText ?? "",
    citations: (row.digestCitations ?? []).flatMap((citation) => {
      const chunk = chunkById.get(String(citation.chunkId))

      if (!chunk) {
        return []
      }

      return [
        {
          chunkId: String(citation.chunkId),
          quote: citation.quote,
          locator: citation.locator,
        },
      ]
    }),
  }))

  const evidence: RetrievalCandidate[] = []
  const seen = new Set<string>()

  for (const section of sections) {
    for (const citation of section.citations) {
      if (seen.has(citation.chunkId)) {
        continue
      }

      const chunk = chunkById.get(citation.chunkId)

      if (!chunk) {
        continue
      }

      seen.add(citation.chunkId)
      evidence.push({
        chunkId: String(chunk.chunkId),
        sourceId: String(chunk.sourceId),
        text: chunk.text,
        score: 1,
        channel: "digest",
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        ordinal: chunk.ordinal,
      })
    }
  }

  if (!evidence.length) {
    const fallbackChunks = await ctx.runQuery(
      internal.retrievalHelpers.listChunksForSources,
      {
        notebookId,
        sourceIds: ready.map((row) => row.sourceId),
        maxChunksPerSource: 2,
      },
    )

    const bySource = new Map<string, ListedChunk[]>()

    for (const chunk of fallbackChunks) {
      const key = String(chunk.sourceId)
      const list = bySource.get(key)

      if (list) {
        list.push(chunk)
      } else {
        bySource.set(key, [chunk])
      }

      evidence.push({
        chunkId: String(chunk.chunkId),
        sourceId: String(chunk.sourceId),
        text: chunk.text,
        score: 1,
        channel: "digest",
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        ordinal: chunk.ordinal,
      })
    }

    for (const section of sections) {
      if (section.citations.length) {
        continue
      }

      const chunks = bySource.get(section.sourceId) ?? []

      section.citations = chunks.map((chunk) => ({
        chunkId: String(chunk.chunkId),
        quote: chunk.text.slice(0, 180).trim(),
      }))
    }
  }

  return {
    evidence,
    digestSections: sections,
    insufficient: !sections.length,
    mode: "corpus" as const,
    evidenceKind: "digest" as const,
  }
}

export const prepareEvidence = action({
  args: {
    notebookId: v.id("notebooks"),
    prompt: v.string(),
    sourceIds: v.array(v.id("sources")),
    messageId: v.optional(v.id("chatEntries")),
    generationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)

    if (!user) {
      throw new Error("You need to sign in to continue.")
    }

    await ctx.runQuery(api.notebooks.get, {
      notebookId: args.notebookId,
    })

    async function setProgress(progressLabel: string) {
      if (!args.messageId || !args.generationId) {
        return
      }

      await ctx.runMutation(api.chat.setProgressLabel, {
        messageId: args.messageId,
        generationId: args.generationId,
        progressLabel,
      })
    }

    const characterCounts = await ctx.runQuery(
      internal.retrievalHelpers.listSourceCharacterCounts,
      {
        notebookId: args.notebookId,
        sourceIds: args.sourceIds,
      },
    )

    if (
      !sourcesExceedEvidenceBudget(characterCounts, EVIDENCE_CHARACTER_BUDGET)
    ) {
      const maxChunksPerSource = maxChunksPerSourceForBudget(
        Math.max(args.sourceIds.length, 1),
        EVIDENCE_CHARACTER_BUDGET,
      )
      const chunks: ListedChunk[] = await ctx.runQuery(
        internal.retrievalHelpers.listChunksForSources,
        {
          notebookId: args.notebookId,
          sourceIds: args.sourceIds,
          maxChunksPerSource,
        },
      )

      const loadedBySource = new Map<string, number>()

      for (const chunk of chunks) {
        const key = String(chunk.sourceId)
        loadedBySource.set(key, (loadedBySource.get(key) ?? 0) + 1)
      }

      const truncated = args.sourceIds.some(
        (sourceId) =>
          (loadedBySource.get(String(sourceId)) ?? 0) >= maxChunksPerSource,
      )

      const inline: RetrievalCandidate[] | null = truncated
        ? null
        : tryPackInlineEvidence(chunks, EVIDENCE_CHARACTER_BUDGET)

      if (inline) {
        let mode: "factual" | "corpus" = "factual"

        if (args.sourceIds.length > 1) {
          await setProgress(CHAT_PROGRESS.categorizing)
          mode = await classifyPromptMode(args.prompt)
        }

        if (mode === "corpus") {
          await setProgress(CHAT_PROGRESS.gathering)
          const digestPack = await buildDigestEvidencePack(
            ctx,
            args.notebookId,
            args.sourceIds,
            args.prompt,
          )

          if (digestPack) {
            return digestPack
          }
        }

        return {
          evidence: inline,
          insufficient: !inline.length,
          mode,
          evidenceKind: "chunks" as const,
        }
      }
    }

    await setProgress(CHAT_PROGRESS.categorizing)
    const mode = await classifyPromptMode(args.prompt)

    if (mode === "corpus") {
      await setProgress(CHAT_PROGRESS.gathering)

      const digestPack = await buildDigestEvidencePack(
        ctx,
        args.notebookId,
        args.sourceIds,
        args.prompt,
      )

      if (digestPack) {
        return digestPack
      }

      const maxChunksPerSource = maxChunksPerSourceForBudget(
        Math.max(args.sourceIds.length, 1),
        EVIDENCE_CHARACTER_BUDGET,
      )
      const chunks: ListedChunk[] = await ctx.runQuery(
        internal.retrievalHelpers.listChunksForSources,
        {
          notebookId: args.notebookId,
          sourceIds: args.sourceIds,
          maxChunksPerSource,
        },
      )

      const evidence = packCoverageEvidence(chunks, EVIDENCE_CHARACTER_BUDGET)

      return {
        evidence,
        insufficient: !evidence.length,
        mode: "corpus" as const,
        evidenceKind: "coverage" as const,
      }
    }

    await setProgress(CHAT_PROGRESS.searching)

    const { embedding: vector } = await embed({
      model: voyage.textEmbedding(MODELS.embed),
      value: args.prompt,
      providerOptions: {
        voyage: {
          inputType: "query",
        },
      },
    })

    const vectorHits = await ctx.runAction(
      internal.retrievalHelpers.searchVectors,
      {
        notebookId: args.notebookId,
        sourceIds: args.sourceIds,
        embedding: vector,
      },
    )

    const textHits = await ctx.runQuery(internal.retrievalHelpers.searchText, {
      notebookId: args.notebookId,
      sourceIds: args.sourceIds,
      prompt: args.prompt,
    })

    const merged = mergeRetrievalCandidates(vectorHits, textHits)
    let ranked = merged

    if (merged.length) {
      await setProgress(CHAT_PROGRESS.ranking)

      try {
        const { ranking } = await rerank({
          model: voyage.reranking(MODELS.rerank),
          documents: merged.map((item) => item.text),
          query: args.prompt,
          topN: Math.min(12, merged.length),
        })

        ranked = ranking
          .map((item) => {
            const candidate = merged[item.originalIndex]

            if (!candidate) {
              return null
            }

            return {
              ...candidate,
              score: item.score,
            }
          })
          .filter((item): item is (typeof merged)[number] => Boolean(item))
      } catch {
        ranked = merged
      }
    }

    const selected = selectEvidenceWithinBudget(
      ranked,
      EVIDENCE_CHARACTER_BUDGET,
    )

    return {
      evidence: selected,
      insufficient: !selected.length,
      mode: "factual" as const,
      evidenceKind: "chunks" as const,
    }
  },
})
