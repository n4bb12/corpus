"use node"

import { createOpenAI } from "@ai-sdk/openai"
import { generateText, Output } from "ai"
import { v } from "convex/values"
import { requireEnv } from "src/lib/env"
import { LIMITS, MODELS } from "src/lib/limits"
import {
  isStaleTitleRefresh,
  shouldSkipTitleRefresh,
} from "src/lib/notebookTitlePolicy"
import {
  fallbackNotebookTitle,
  isSingleSourceNotebookTitle,
  isUsableNotebookTitle,
} from "src/lib/notebookTitleQuality"
import { formatTitle, titleFromSourceLabel } from "src/lib/sourceTitle"
import { z } from "zod"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { internalAction } from "./_generated/server"

const titleSchema = z.object({
  title: z.string(),
  sourceIds: z.array(z.string()),
})

function cleanGeneratedTitle(raw: string) {
  return formatTitle(raw.replace(/^["'`“”]+|["'`“”]+$/g, ""))
}

function preferredSourceLabel(source: {
  title: string
  originalTitle: string
}) {
  const display = titleFromSourceLabel(source.title, "")
  const original = titleFromSourceLabel(source.originalTitle, "")

  if (isUsableNotebookTitle(display)) {
    return display
  }

  if (isUsableNotebookTitle(original)) {
    return original
  }

  return ""
}

function acceptNotebookTitle(title: string, sourceLabels: string[]) {
  if (!isUsableNotebookTitle(title)) {
    return false
  }

  if (isSingleSourceNotebookTitle(title, sourceLabels)) {
    return false
  }

  return true
}

/**
 * First-source hook kept for callers that still pass a sourceId; titles are
 * built from ready sources via refreshNotebookTitle.
 */
export const maybeGenerateNotebookTitle = internalAction({
  args: {
    notebookId: v.id("notebooks"),
    sourceId: v.id("sources"),
  },
  handler: async (ctx, args) => {
    void args.sourceId
    await ctx.runAction(internal.titles.refreshNotebookTitle, {
      notebookId: args.notebookId,
    })
  },
})

/**
 * Rebuild an automatic title from available source evidence, including digest
 * drafts produced during indexing. No-op when the title is manual.
 */
export const refreshNotebookTitle = internalAction({
  args: {
    notebookId: v.id("notebooks"),
    generation: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.runQuery(internal.titlesHelpers.getNotebook, {
      notebookId: args.notebookId,
    })

    if (!notebook || shouldSkipTitleRefresh(notebook.titleOrigin)) {
      return
    }

    const generation =
      typeof args.generation === "number"
        ? args.generation
        : (notebook.titleRefreshGeneration ?? 0)

    // Only skip starting work when a newer refresh was already scheduled.
    // Finished results may still apply when their sources remain eligible —
    // overlapping LLM calls must not leave the notebook untitled just because
    // another source finished mid-flight.
    if (
      typeof args.generation === "number" &&
      isStaleTitleRefresh(notebook.titleRefreshGeneration, args.generation)
    ) {
      return
    }

    if (notebook.titleGenerationState !== "pending") {
      await ctx.runMutation(internal.titlesHelpers.setTitleState, {
        notebookId: args.notebookId,
        titleGenerationState: "pending",
      })
    }

    const sources = await ctx.runQuery(
      internal.titlesHelpers.listReadySourcesForTitle,
      {
        notebookId: args.notebookId,
      },
    )

    if (!sources.length) {
      const latest = await ctx.runQuery(internal.titlesHelpers.getNotebook, {
        notebookId: args.notebookId,
      })

      if (
        latest &&
        !isStaleTitleRefresh(latest.titleRefreshGeneration, generation)
      ) {
        await ctx.runMutation(internal.titlesHelpers.clearAutomaticTitle, {
          notebookId: args.notebookId,
          generation,
        })
      }

      return
    }

    const excerpts: string[] = []
    const digests: string[] = []
    const includedSourceIds: Array<Id<"sources">> = []
    const sourceLabels: string[] = []

    for (const source of sources.slice(0, LIMITS.sourcesPerNotebook)) {
      const label = preferredSourceLabel(source)

      if (label) {
        sourceLabels.push(label)
      }

      const digest = source.digestText?.trim()
      const heading = label || source.title || "Untitled source"

      if (digest) {
        const sourceId = String(source._id)
        excerpts.push(`### source:${sourceId} — ${heading}\n${digest}`)
        digests.push(digest)
        includedSourceIds.push(source._id)
        continue
      }

      if (!source.normalizedStorageId) {
        continue
      }

      try {
        const blob = await ctx.storage.get(source.normalizedStorageId)

        if (!blob) {
          continue
        }

        const perSource = Math.max(
          800,
          Math.floor(4_000 / Math.min(sources.length, 4)),
        )
        const markdown = (await blob.text()).slice(0, perSource)
        const sourceId = String(source._id)
        excerpts.push(`### source:${sourceId} — ${heading}\n${markdown}`)
        digests.push(markdown)
        includedSourceIds.push(source._id)
      } catch {
        // Skip unreadable sources; others may still title the notebook.
      }
    }

    const corpus = excerpts.join("\n\n").slice(0, 6_000)
    const sourceCount = Math.max(excerpts.length, sources.length)
    const labelList = sourceLabels.join("; ") || "(none usable)"
    const fallbackLabel = fallbackNotebookTitle({
      sourceLabels,
      digests,
    })

    try {
      if (!corpus.trim()) {
        throw new Error("No source text for title.")
      }

      const openai = createOpenAI({
        apiKey: requireEnv("OPENAI_API_KEY"),
      })

      const multiSourceRules =
        sourceCount > 1
          ? `
- There are ${sourceCount} sources. Title the notebook as a collection.
- Reflect what the sources share or how they relate — do not copy only one source title
- Do not start with vague words like excerpt, notes, document, or paper`
          : `
- Prefer a topical phrase grounded in the source content
- Do not start with vague words like excerpt, notes, document, or paper`

      const result = await generateText({
        model: openai(MODELS.title),
        prompt: `Write a short notebook title for this collection of sources.
Source names: ${labelList}
Rules:
- Keep it brief: a compact topical phrase, not a full sentence
- No URLs, hostnames, file paths, filenames, or document codes
- Return a title and the source IDs you considered${multiSourceRules}

${corpus}`,
        output: Output.object({ schema: titleSchema }),
      })

      const title = cleanGeneratedTitle(result.output?.title ?? "")
      const coveredSourceIds = new Set(result.output?.sourceIds ?? [])
      const coversEverySource = includedSourceIds.every((sourceId) =>
        coveredSourceIds.has(String(sourceId)),
      )

      if (coversEverySource && acceptNotebookTitle(title, sourceLabels)) {
        await ctx.runMutation(internal.titlesHelpers.applyGeneratedTitle, {
          notebookId: args.notebookId,
          title,
          sourceIds: includedSourceIds,
        })
        return
      }

      throw new Error("Empty or weak generated title.")
    } catch (error) {
      console.error(
        "[title-refresh]",
        error instanceof Error ? error.message : "Unknown title error",
      )

      if (fallbackLabel && acceptNotebookTitle(fallbackLabel, sourceLabels)) {
        await ctx.runMutation(internal.titlesHelpers.applyGeneratedTitle, {
          notebookId: args.notebookId,
          title: fallbackLabel,
          sourceIds: includedSourceIds,
        })
        return
      }

      await ctx.runMutation(internal.titlesHelpers.setTitleState, {
        notebookId: args.notebookId,
        titleGenerationState: "failed",
      })
    }
  },
})
