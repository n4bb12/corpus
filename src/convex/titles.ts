"use node"

import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { v } from "convex/values"
import { requireEnv } from "src/lib/env"
import { LIMITS, MODELS } from "src/lib/limits"
import {
  formatTitle,
  isWeakTitle,
  looksLikeDocumentCode,
  looksLikeFilename,
  looksLikeUrl,
  titleFromSourceLabel,
} from "src/lib/sourceTitle"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"

/** Enough for a few short words; keeps the model from drafting a sentence. */
const TITLE_MAX_OUTPUT_TOKENS = 24

function cleanGeneratedTitle(raw: string) {
  return formatTitle(raw.replace(/^["'`“”]+|["'`“”]+$/g, ""))
}

function isUsableTitle(title: string) {
  return (
    !!title &&
    title.length <= LIMITS.maxTitleCharacters &&
    !looksLikeFilename(title) &&
    !looksLikeUrl(title) &&
    !looksLikeDocumentCode(title) &&
    !isWeakTitle(title)
  )
}

function preferredSourceLabel(source: {
  title: string
  originalTitle: string
}) {
  const display = titleFromSourceLabel(source.title, "")
  const original = titleFromSourceLabel(source.originalTitle, "")

  if (isUsableTitle(display)) {
    return display
  }

  if (isUsableTitle(original)) {
    return original
  }

  return ""
}

/**
 * First-source hook kept for callers that still pass a sourceId; titles are
 * built from all ready sources via refreshNotebookTitle.
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

/** Rebuild an automatic title from ready sources (no-op when title is manual). */
export const refreshNotebookTitle = internalAction({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.runQuery(internal.titlesHelpers.getNotebook, {
      notebookId: args.notebookId,
    })

    if (!notebook || notebook.titleOrigin === "manual") {
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
      await ctx.runMutation(internal.titlesHelpers.setTitleState, {
        notebookId: args.notebookId,
        titleGenerationState: "idle",
      })
      return
    }

    const excerpts: string[] = []
    const labels: string[] = []

    for (const source of sources.slice(0, LIMITS.sourcesPerNotebook)) {
      const label = preferredSourceLabel(source)

      if (label) {
        labels.push(label)
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
        const heading = label || source.title || "Untitled"
        excerpts.push(
          `Source title: ${heading}\n${(await blob.text()).slice(0, perSource)}`,
        )
      } catch {
        // Skip unreadable sources; others may still title the notebook.
      }
    }

    const corpus = excerpts.join("\n\n").slice(0, 6_000)
    const fallbackLabel = labels.find((label) => isUsableTitle(label))

    try {
      if (!corpus.trim()) {
        throw new Error("No source text for title.")
      }

      const openai = createOpenAI({
        apiKey: requireEnv("OPENAI_API_KEY"),
      })

      const result = await generateText({
        model: openai(MODELS.title),
        maxOutputTokens: TITLE_MAX_OUTPUT_TOKENS,
        prompt: `Write a very short notebook title for this collection of sources.
Rules:
- At most 5 words
- Prefer a topical phrase grounded in the content or source titles
- Do not use URLs, hostnames, file paths, or filenames
- Return only the title

${corpus}`,
      })

      const title = cleanGeneratedTitle(result.text)

      if (isUsableTitle(title)) {
        await ctx.runMutation(internal.titlesHelpers.applyGeneratedTitle, {
          notebookId: args.notebookId,
          title,
        })
        return
      }

      throw new Error("Empty or weak generated title.")
    } catch {
      if (fallbackLabel) {
        await ctx.runMutation(internal.titlesHelpers.applyGeneratedTitle, {
          notebookId: args.notebookId,
          title: fallbackLabel,
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
