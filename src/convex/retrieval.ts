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
import { z } from "zod"
import { api, internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { action } from "./_generated/server"
import { authComponent } from "./auth"

type ListedChunk = {
  chunkId: Id<"chunks">
  sourceId: Id<"sources">
  text: string
  startOffset: number
  endOffset: number
  ordinal: number
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

        return {
          evidence: inline,
          insufficient: !inline.length,
          mode,
        }
      }
    }

    await setProgress(CHAT_PROGRESS.categorizing)
    const mode = await classifyPromptMode(args.prompt)

    if (mode === "corpus") {
      await setProgress(CHAT_PROGRESS.gathering)

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
    }
  },
})
