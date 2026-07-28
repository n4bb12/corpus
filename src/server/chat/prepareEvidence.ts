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
  formatCorpusEvidence,
  formatFlatEvidence,
} from "src/lib/evidencePrompt"
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
import {
  addMissingDigestCitationFallbacks,
  type DigestSection,
  formatDigestEvidence,
  isCorpusSummaryPrompt,
} from "src/lib/sourceDigest"
import type { EvidenceItem, EvidencePack } from "src/server/chat/runAnswerTurn"
import { generateSourceDigest } from "src/server/sources/generateSourceDigest"
import { z } from "zod"

export type PromptReadyEvidence = EvidencePack & {
  evidenceBlock: string
  systemAddendum: string
  useDigestEvidence: boolean
}

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

async function backfillSourceDigest(
  source: SourceDigestRow,
  notebookId: string,
) {
  try {
    const url = await fetchAuthQuery(api.sources.getNormalizedContent, {
      sourceId: source.sourceId as never,
    })

    if (typeof url !== "string" || !url) {
      return null
    }

    const response = await fetch(url)

    if (!response.ok) {
      return null
    }

    const markdown = await response.text()
    const chunks = (await fetchAuthQuery(
      api.retrievalHelpers.listChunksForSources,
      {
        notebookId: notebookId as never,
        sourceIds: [source.sourceId as never],
        maxChunksPerSource: 40,
      },
    )) as ListedChunk[]

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
      await fetchAuthMutation(api.ingestion.setDigest, {
        sourceId: source.sourceId as never,
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
          chunkId: chunk.chunkId as never,
          quote: citation.quote,
          locator: citation.locator,
        },
      ]
    })

    await fetchAuthMutation(api.ingestion.setDigest, {
      sourceId: source.sourceId as never,
      digestStatus: "ready",
      digestText: digest.digestText,
      digestCitations: citations,
    })

    return {
      sourceId: source.sourceId,
      title: source.title,
      digestStatus: "ready" as const,
      digestText: digest.digestText,
      digestCitations: citations.map((citation) => ({
        chunkId: String(citation.chunkId),
        quote: citation.quote,
        locator: citation.locator,
      })),
      normalizedStorageId: source.normalizedStorageId,
    } satisfies SourceDigestRow
  } catch {
    try {
      await fetchAuthMutation(api.ingestion.setDigest, {
        sourceId: source.sourceId as never,
        digestStatus: "failed",
      })
    } catch {
      // Ignore persistence failures during backfill.
    }

    return null
  }
}

async function buildDigestEvidencePack(
  notebookId: string,
  sourceIds: string[],
  prompt: string,
) {
  let rows = (await fetchAuthQuery(api.retrievalHelpers.listSourceDigests, {
    notebookId: notebookId as never,
    sourceIds: sourceIds as never,
  })) as SourceDigestRow[]

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

      const backfilled = await backfillSourceDigest(row, notebookId)

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

  const chunks = citationIds.length
    ? ((await fetchAuthQuery(api.retrievalHelpers.getChunksByIds, {
        notebookId: notebookId as never,
        chunkIds: citationIds as never,
      })) as ListedChunk[])
    : []
  const chunkById = new Map(
    chunks.map((chunk) => [String(chunk.chunkId), chunk]),
  )

  let sections: DigestSection[] = ready.map((row) => ({
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

  const sourceIdsMissingCitations = sections
    .filter((section) => !section.citations.length)
    .map((section) => section.sourceId)

  if (sourceIdsMissingCitations.length) {
    const fallbackChunks = (await fetchAuthQuery(
      api.retrievalHelpers.listChunksForSources,
      {
        notebookId: notebookId as never,
        sourceIds: sourceIdsMissingCitations as never,
        maxChunksPerSource: 2,
      },
    )) as ListedChunk[]

    for (const chunk of fallbackChunks) {
      const chunkId = String(chunk.chunkId)

      if (seen.has(chunkId)) {
        continue
      }

      seen.add(chunkId)
      evidence.push({
        chunkId,
        sourceId: String(chunk.sourceId),
        text: chunk.text,
        score: 1,
        channel: "digest",
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        ordinal: chunk.ordinal,
      })
    }

    sections = addMissingDigestCitationFallbacks(
      sections,
      fallbackChunks.map((chunk) => ({
        ...chunk,
        chunkId: String(chunk.chunkId),
        sourceId: String(chunk.sourceId),
      })),
    )
  }

  return {
    evidence,
    digestSections: sections,
    insufficient: !sections.length,
    mode: "corpus" as const,
    evidenceKind: "digest" as const,
  }
}

function toEvidenceItems(candidates: RetrievalCandidate[]): EvidenceItem[] {
  return candidates.map((item) => ({
    chunkId: String(item.chunkId),
    sourceId: String(item.sourceId),
    text: item.text,
    startOffset: item.startOffset,
    endOffset: item.endOffset,
    ordinal: item.ordinal,
  }))
}

function makePromptReady(
  pack: {
    evidence: RetrievalCandidate[]
    insufficient: boolean
    mode: "factual" | "corpus"
    evidenceKind?: "digest" | "coverage" | "chunks"
    digestSections?: DigestSection[]
  },
  sourceIds: string[],
  sourceTitleById: Map<string, string>,
): PromptReadyEvidence {
  const evidence = toEvidenceItems(pack.evidence)
  const useDigestEvidence =
    pack.evidenceKind === "digest" && !!pack.digestSections?.length
  const distinctSourceCount = new Set(evidence.map((item) => item.sourceId))
    .size
  const useCorpusLayout =
    useDigestEvidence ||
    pack.mode === "corpus" ||
    (distinctSourceCount > 1 && pack.mode !== "factual")

  const evidenceBlock = useDigestEvidence
    ? formatDigestEvidence(pack.digestSections ?? [], sourceIds)
    : useCorpusLayout
      ? formatCorpusEvidence(evidence, sourceTitleById, sourceIds)
      : formatFlatEvidence(evidence)

  const sourceNames = sourceIds
    .map((sourceId) => {
      const title = sourceTitleById.get(sourceId)?.trim()

      return title || sourceId
    })
    .join("; ")

  const systemAddendum = useDigestEvidence
    ? `
This question is a cross-cutting task over multiple sources.
Selected sources: ${sourceNames || "(none)"}.
Evidence is a per-source digest with supporting quotes. Synthesize from the digests; cite only the provided supporting quote chunk ids.
You must cover every source section that has a digest—do not skip a source, and do not focus on only one source.
For summaries and briefs, cover each source in turn (or clearly synthesize with citations from each).
Ignore prior answers that omitted sources; re-answer from the digests below.
`
    : useCorpusLayout
      ? `
This question is a cross-cutting task over multiple sources.
Selected sources: ${sourceNames || "(none)"}.
Evidence is grouped under each source title. You must write at least one grounded paragraph with citations for every source section that has chunks—do not skip a source, and do not focus on only one source.
For summaries and briefs, cover each source in turn (or clearly synthesize with citations from each).
For contradictions or contested claims, state agreements and disagreements and cite each side.
Ignore prior answers that omitted sources; re-answer from the evidence below.
`
      : ""

  return {
    evidence,
    insufficient: pack.insufficient,
    mode: pack.mode,
    evidenceKind: pack.evidenceKind,
    digestSections: pack.digestSections,
    evidenceBlock,
    systemAddendum,
    useDigestEvidence,
  }
}

/**
 * Evidence pack orchestration: classify, retrieve/rerank or digest-pack, and
 * format a prompt-ready pack for the Answer turn.
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
        const digestPack = await buildDigestEvidencePack(
          args.notebookId,
          args.sourceIds,
          args.prompt,
        )

        if (digestPack) {
          return makePromptReady(
            digestPack,
            args.sourceIds,
            args.sourceTitleById,
          )
        }
      }

      return makePromptReady(
        {
          evidence: inline,
          insufficient: !inline.length,
          mode,
          evidenceKind: "chunks",
        },
        args.sourceIds,
        args.sourceTitleById,
      )
    }
  }

  await setProgress(CHAT_PROGRESS.categorizing)
  const mode = await classifyPromptMode(args.prompt)

  if (mode === "corpus") {
    await setProgress(CHAT_PROGRESS.gathering)

    const digestPack = await buildDigestEvidencePack(
      args.notebookId,
      args.sourceIds,
      args.prompt,
    )

    if (digestPack) {
      return makePromptReady(digestPack, args.sourceIds, args.sourceTitleById)
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

    const evidence = packCoverageEvidence(chunks, EVIDENCE_CHARACTER_BUDGET)

    return makePromptReady(
      {
        evidence,
        insufficient: !evidence.length,
        mode: "corpus",
        evidenceKind: "coverage",
      },
      args.sourceIds,
      args.sourceTitleById,
    )
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

  return makePromptReady(
    {
      evidence: selected,
      insufficient: !selected.length,
      mode: "factual",
      evidenceKind: "chunks",
    },
    args.sourceIds,
    args.sourceTitleById,
  )
}
