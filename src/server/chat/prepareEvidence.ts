import { createOpenAI } from "@ai-sdk/openai"
import { voyage } from "@ai-sdk/voyage"
import { embed, generateText, Output, rerank } from "ai"
import { api } from "src/convex/_generated/api"
import {
  fetchAuthAction,
  fetchAuthMutation,
  fetchAuthQuery,
} from "src/lib/authServer"
import { CHAT_PROGRESS } from "src/lib/chatProgress"
import { requireEnv } from "src/lib/env"
import {
  buildDigestEvidencePack,
  type PromptReadyEvidence,
  packEvidence,
  type ReadyDigestRow,
} from "src/lib/evidencePack"
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

export type { PromptReadyEvidence }

type ListedChunk = {
  chunkId: string
  sourceId: string
  text: string
  startOffset: number
  endOffset: number
  ordinal: number
}

type SourceDigestRow = {
  sourceId: string
  title: string
  digestStatus?: "pending" | "ready" | "failed"
  digestText?: string
  digestCitations?: Array<{
    chunkId: string
    quote: string
    locator?: {
      startOffset: number
      endOffset: number
      ordinal: number
    }
  }>
  normalizedStorageId?: string
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

async function loadDigestEvidencePack(notebookId: string, sourceIds: string[]) {
  const rows = (await fetchAuthQuery(api.retrievalHelpers.listSourceDigests, {
    notebookId: notebookId as never,
    sourceIds: sourceIds as never,
  })) as SourceDigestRow[]

  const ready: ReadyDigestRow[] = rows.flatMap((row) => {
    if (
      row.digestStatus !== "ready" ||
      typeof row.digestText !== "string" ||
      !row.digestText.trim()
    ) {
      return []
    }

    return [
      {
        sourceId: String(row.sourceId),
        title: row.title,
        digestText: row.digestText,
        digestCitations: row.digestCitations,
      },
    ]
  })

  if (!ready.length) {
    return null
  }

  const citationIds: string[] = []
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

  const citationChunks = citationIds.length
    ? (
        (await fetchAuthQuery(api.retrievalHelpers.getChunksByIds, {
          notebookId: notebookId as never,
          chunkIds: citationIds as never,
        })) as ListedChunk[]
      ).map((chunk) => ({
        ...chunk,
        chunkId: String(chunk.chunkId),
        sourceId: String(chunk.sourceId),
      }))
    : []

  const initial = buildDigestEvidencePack(ready, citationChunks)

  if (!initial) {
    return null
  }

  const missingSourceIds = initial.digestSections
    .filter((section) => !section.citations.length)
    .map((section) => section.sourceId)

  if (!missingSourceIds.length) {
    return initial
  }

  const fallbackChunks = (
    (await fetchAuthQuery(api.retrievalHelpers.listChunksForSources, {
      notebookId: notebookId as never,
      sourceIds: missingSourceIds as never,
      maxChunksPerSource: 2,
    })) as ListedChunk[]
  ).map((chunk) => ({
    ...chunk,
    chunkId: String(chunk.chunkId),
    sourceId: String(chunk.sourceId),
  }))

  return buildDigestEvidencePack(ready, citationChunks, fallbackChunks)
}

/**
 * Evidence pack orchestration: classify, load, and pack prompt-ready evidence.
 */
export async function prepareEvidence(args: {
  notebookId: string
  prompt: string
  sourceIds: string[]
  messageId?: string
  generationId?: string
  sourceTitleById: Map<string, string>
}): Promise<PromptReadyEvidence> {
  await fetchAuthQuery(api.notebooks.get, {
    notebookId: args.notebookId as never,
  })

  const setProgress = async (progressLabel: string) => {
    if (!args.messageId || !args.generationId) {
      return
    }

    await fetchAuthMutation(api.chat.setProgressLabel, {
      messageId: args.messageId as never,
      generationId: args.generationId,
      progressLabel,
    })
  }

  const characterCounts = (await fetchAuthQuery(
    api.retrievalHelpers.listSourceCharacterCounts,
    {
      notebookId: args.notebookId as never,
      sourceIds: args.sourceIds as never,
    },
  )) as Array<number | undefined>

  if (
    !sourcesExceedEvidenceBudget(characterCounts, EVIDENCE_CHARACTER_BUDGET)
  ) {
    const maxChunksPerSource = maxChunksPerSourceForBudget(
      Math.max(args.sourceIds.length, 1),
      EVIDENCE_CHARACTER_BUDGET,
    )
    const chunks = (await fetchAuthQuery(
      api.retrievalHelpers.listChunksForSources,
      {
        notebookId: args.notebookId as never,
        sourceIds: args.sourceIds as never,
        maxChunksPerSource,
      },
    )) as ListedChunk[]

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
        const digestPack = await loadDigestEvidencePack(
          args.notebookId,
          args.sourceIds,
        )

        return packEvidence({
          mode,
          sourceIds: args.sourceIds,
          sourceTitleById: args.sourceTitleById,
          digestPack,
          chunks: inline,
        })
      }

      return packEvidence({
        mode,
        sourceIds: args.sourceIds,
        sourceTitleById: args.sourceTitleById,
        chunks: inline,
      })
    }
  }

  await setProgress(CHAT_PROGRESS.categorizing)
  const mode = await classifyPromptMode(args.prompt)

  if (mode === "corpus") {
    await setProgress(CHAT_PROGRESS.gathering)

    const digestPack = await loadDigestEvidencePack(
      args.notebookId,
      args.sourceIds,
    )

    if (digestPack) {
      return packEvidence({
        mode,
        sourceIds: args.sourceIds,
        sourceTitleById: args.sourceTitleById,
        digestPack,
      })
    }

    const maxChunksPerSource = maxChunksPerSourceForBudget(
      Math.max(args.sourceIds.length, 1),
      EVIDENCE_CHARACTER_BUDGET,
    )
    const chunks = (await fetchAuthQuery(
      api.retrievalHelpers.listChunksForSources,
      {
        notebookId: args.notebookId as never,
        sourceIds: args.sourceIds as never,
        maxChunksPerSource,
      },
    )) as ListedChunk[]

    const coverage = packCoverageEvidence(chunks, EVIDENCE_CHARACTER_BUDGET)

    return packEvidence({
      mode: "corpus",
      sourceIds: args.sourceIds,
      sourceTitleById: args.sourceTitleById,
      coverage,
    })
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

  const vectorHitsRaw = await fetchAuthAction(
    api.retrievalHelpers.searchVectors,
    {
      notebookId: args.notebookId as never,
      sourceIds: args.sourceIds as never,
      embedding: vector,
    },
  )
  const vectorHits: RetrievalCandidate[] = (
    vectorHitsRaw as Array<{
      chunkId: string
      sourceId: string
      text: string
      score: number
      startOffset: number
      endOffset: number
      ordinal: number
    }>
  ).map((item) => ({
    ...item,
    chunkId: String(item.chunkId),
    sourceId: String(item.sourceId),
    channel: "vector" as const,
  }))

  const textHitsRaw = await fetchAuthQuery(api.retrievalHelpers.searchText, {
    notebookId: args.notebookId as never,
    sourceIds: args.sourceIds as never,
    prompt: args.prompt,
  })
  const textHits: RetrievalCandidate[] = (
    textHitsRaw as Array<{
      chunkId: string
      sourceId: string
      text: string
      score: number
      startOffset: number
      endOffset: number
      ordinal: number
    }>
  ).map((item) => ({
    ...item,
    chunkId: String(item.chunkId),
    sourceId: String(item.sourceId),
    channel: "text" as const,
  }))

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

  const selected = selectEvidenceWithinBudget(ranked, EVIDENCE_CHARACTER_BUDGET)

  return packEvidence({
    mode: "factual",
    sourceIds: args.sourceIds,
    sourceTitleById: args.sourceTitleById,
    chunks: selected,
  })
}
