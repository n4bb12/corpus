import { createOpenAI } from "@ai-sdk/openai"
import { generateText, Output } from "ai"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { requireEnv } from "src/lib/env"
import { LIMITS, MODELS } from "src/lib/limits"
import {
  isStaleTitleRefresh,
  shouldSkipTitleRefresh,
  TITLE_REFRESH_DEBOUNCE_MS,
} from "src/lib/notebookTitlePolicy"
import { isUsableNotebookTitle } from "src/lib/notebookTitleQuality"
import {
  cleanGeneratedTitle,
  proposeNotebookTitle,
} from "src/lib/proposeNotebookTitle"
import {
  formatTitle,
  humanizeFilenameTitle,
  looksLikeFilename,
} from "src/lib/sourceTitle"
import { createAuthedConvexClient } from "src/server/convexClient"
import { z } from "zod"

const titleSchema = z.object({
  title: z.string(),
})

function preferredSourceLabel(source: {
  title: string
  originalTitle: string
}) {
  const display = fullSourceLabel(source.title)
  const original = fullSourceLabel(source.originalTitle)

  if (isUsableNotebookTitle(display)) {
    return display
  }

  if (isUsableNotebookTitle(original)) {
    return original
  }

  return ""
}

function fullSourceLabel(value: string) {
  if (looksLikeFilename(value)) {
    return humanizeFilenameTitle(value)
  }

  return formatTitle(value)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Title refresh orchestrator: debounce, load corpus, propose, apply via mutations.
 */
export async function refreshNotebookTitle(args: {
  notebookId: string
  generation: number
  token: string
  debounceMs?: number
}) {
  const client = createAuthedConvexClient(args.token)
  const notebookId = args.notebookId as Id<"notebooks">
  const debounceMs = args.debounceMs ?? TITLE_REFRESH_DEBOUNCE_MS

  if (debounceMs > 0) {
    await sleep(debounceMs)
  }

  const notebook = await client.query(api.titlesHelpers.getNotebook, {
    notebookId,
  })

  if (!notebook || shouldSkipTitleRefresh(notebook.titleOrigin)) {
    return
  }

  if (isStaleTitleRefresh(notebook.titleRefreshGeneration, args.generation)) {
    return
  }

  if (notebook.titleGenerationState !== "pending") {
    await client.mutation(api.titlesHelpers.setTitleState, {
      notebookId,
      titleGenerationState: "pending",
    })
  }

  const sources = await client.query(
    api.titlesHelpers.listReadySourcesForTitle,
    { notebookId },
  )

  if (!sources.length) {
    const latest = await client.query(api.titlesHelpers.getNotebook, {
      notebookId,
    })

    if (
      latest &&
      !isStaleTitleRefresh(latest.titleRefreshGeneration, args.generation)
    ) {
      await client.mutation(api.titlesHelpers.clearAutomaticTitle, {
        notebookId,
        generation: args.generation,
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
      const url = await client.query(api.sources.getNormalizedContent, {
        sourceId: source._id,
      })

      if (typeof url !== "string" || !url) {
        continue
      }

      const response = await fetch(url)

      if (!response.ok) {
        continue
      }

      const perSource = Math.max(
        800,
        Math.floor(4_000 / Math.min(sources.length, 4)),
      )
      const markdown = (await response.text()).slice(0, perSource)
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

  let modelOutput: { title: string } | null = null

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
- Synthesize the central topic or relationship across all sources
- Use the language used by the sources
- Write 3–8 words, not a sentence or a list of source names
- No URLs, hostnames, file paths, filenames, or document codes
- Ignore branding slogans and generic marketing copy${multiSourceRules}

${corpus}`,
      output: Output.object({ schema: titleSchema }),
    })

    modelOutput = {
      title: cleanGeneratedTitle(result.output?.title ?? ""),
    }
  } catch (error) {
    console.error(
      "[title-refresh]",
      error instanceof Error ? error.message : "Unknown title error",
    )
  }

  const proposal = proposeNotebookTitle({
    sourceLabels,
    digests,
    modelOutput,
  })

  if (proposal.kind === "title" || proposal.kind === "fallback") {
    await client.mutation(api.titlesHelpers.applyGeneratedTitle, {
      notebookId,
      title: proposal.title,
      sourceIds: includedSourceIds,
    })
    return
  }

  await client.mutation(api.titlesHelpers.setTitleState, {
    notebookId,
    titleGenerationState: "failed",
  })
}
