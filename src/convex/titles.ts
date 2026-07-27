"use node"

import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { v } from "convex/values"
import { requireEnv } from "src/lib/env"
import { MODELS } from "src/lib/limits"
import {
  compactTitle,
  isWeakTitle,
  looksLikeFilename,
  titleFromMarkdown,
  titleFromSourceLabel,
} from "src/lib/sourceTitle"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"

function cleanGeneratedTitle(raw: string) {
  return compactTitle(
    raw
      .replace(/^["'`“”]+|["'`“”]+$/g, "")
      .replace(/\s+/g, " ")
      .trim(),
    "",
  )
}

function isUsableTitle(title: string) {
  return !!title && !looksLikeFilename(title) && !isWeakTitle(title)
}

export const maybeGenerateNotebookTitle = internalAction({
  args: {
    notebookId: v.id("notebooks"),
    sourceId: v.id("sources"),
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.runQuery(internal.titlesHelpers.getNotebook, {
      notebookId: args.notebookId,
    })

    if (
      notebook?.titleOrigin !== "placeholder" ||
      notebook.titleGenerationState === "pending" ||
      notebook.titleGenerationState === "complete"
    ) {
      return
    }

    const source = await ctx.runQuery(internal.ingestionHelpers.getSource, {
      sourceId: args.sourceId,
    })

    if (!source?.normalizedStorageId) {
      return
    }

    await ctx.runMutation(internal.titlesHelpers.setTitleState, {
      notebookId: args.notebookId,
      titleGenerationState: "pending",
    })

    const applyTitle = async (title: string) => {
      await ctx.runMutation(internal.titlesHelpers.applyGeneratedTitle, {
        notebookId: args.notebookId,
        title,
      })
    }

    const fail = async () => {
      await ctx.runMutation(internal.titlesHelpers.setTitleState, {
        notebookId: args.notebookId,
        titleGenerationState: "failed",
      })
    }

    const sourceLabel = titleFromSourceLabel(
      source.originalTitle || source.title,
      "",
    )

    let markdown = ""

    try {
      const blob = await ctx.storage.get(source.normalizedStorageId)

      if (!blob) {
        throw new Error("Missing normalized source.")
      }

      markdown = (await blob.text()).slice(0, 4000)
      const openai = createOpenAI({
        apiKey: requireEnv("OPENAI_API_KEY"),
      })

      const labelHint = sourceLabel ? `Source label: ${sourceLabel}\n` : ""

      const result = await generateText({
        model: openai(MODELS.title),
        prompt: `${labelHint}Create a compact notebook title for this source.
Rules:
- Max 5 words
- Specific topical phrase with clear subject
- Prefer the source label when it is already clear
- Do not copy section labels like "Wichtiger Hinweis"
- Do not copy or truncate a sentence from the source
- Return only the title

${markdown}`,
      })

      const title = cleanGeneratedTitle(result.text)

      if (isUsableTitle(title)) {
        await applyTitle(title)
        return
      }

      throw new Error("Empty or weak generated title.")
    } catch {
      if (isUsableTitle(sourceLabel)) {
        await applyTitle(sourceLabel)
        return
      }

      const fromContent = titleFromMarkdown(markdown, "")

      if (isUsableTitle(fromContent)) {
        await applyTitle(fromContent)
        return
      }

      await fail()
    }
  },
})
