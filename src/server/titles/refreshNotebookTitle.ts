import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { LIMITS } from "src/lib/limits"
import {
  type TitleSourceSnapshot,
  titleFromSourceSnapshots,
} from "src/lib/notebookTitleFromSources"
import {
  isStaleTitleRefresh,
  shouldSkipTitleRefresh,
  TITLE_REFRESH_DEBOUNCE_MS,
} from "src/lib/notebookTitlePolicy"
import { createAuthedConvexClient } from "src/server/convexClient"
import { createOpenAITitleGenerator } from "src/server/titles/openaiTitleGenerator"

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

  const snapshots: TitleSourceSnapshot[] = []

  for (const source of sources.slice(0, LIMITS.sourcesPerNotebook)) {
    const digest = source.digestText?.trim()

    if (digest) {
      snapshots.push({
        sourceId: String(source._id),
        title: source.title,
        originalTitle: source.originalTitle,
        text: digest,
      })
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

      snapshots.push({
        sourceId: String(source._id),
        title: source.title,
        originalTitle: source.originalTitle,
        text: await response.text(),
      })
    } catch {
      // Skip unreadable sources; others may still title the notebook.
    }
  }

  const { proposal, includedSourceIds } = await titleFromSourceSnapshots({
    sources: snapshots,
    generateTitle: createOpenAITitleGenerator(),
  })

  if (proposal.kind === "title" || proposal.kind === "fallback") {
    await client.mutation(api.titlesHelpers.applyGeneratedTitle, {
      notebookId,
      title: proposal.title,
      sourceIds: includedSourceIds as Array<Id<"sources">>,
    })
    return
  }

  await client.mutation(api.titlesHelpers.setTitleState, {
    notebookId,
    titleGenerationState: "failed",
  })
}
