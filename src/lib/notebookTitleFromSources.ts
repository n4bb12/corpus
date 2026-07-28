import { LIMITS } from "src/lib/limits"
import { isUsableNotebookTitle } from "src/lib/notebookTitleQuality"
import {
  cleanGeneratedTitle,
  type ProposeNotebookTitleResult,
  proposeNotebookTitle,
} from "src/lib/proposeNotebookTitle"
import {
  formatTitle,
  humanizeFilenameTitle,
  looksLikeFilename,
} from "src/lib/sourceTitle"

export type TitleSourceSnapshot = {
  sourceId: string
  title: string
  originalTitle: string
  text: string
}

export type TitleGenerator = {
  generateOnce: (args: { prompt: string }) => Promise<{ title: string } | null>
}

export type TitleFromSourcesResult = {
  proposal: ProposeNotebookTitleResult
  includedSourceIds: string[]
}

const CORPUS_CHAR_BUDGET = 6_000

function fullSourceLabel(value: string) {
  if (looksLikeFilename(value)) {
    return humanizeFilenameTitle(value)
  }

  return formatTitle(value)
}

export function preferredSourceLabel(source: {
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

function perSourceExcerptBudget(sourceCount: number) {
  return Math.max(800, Math.floor(4_000 / Math.min(sourceCount, 4)))
}

function buildTitlePrompt(args: {
  sourceCount: number
  labelList: string
  corpus: string
}) {
  const multiSourceRules =
    args.sourceCount > 1
      ? `
- There are ${args.sourceCount} sources. Title the notebook as a collection.
- Reflect what the sources share or how they relate — do not copy only one source title
- Do not start with vague words like excerpt, notes, document, or paper`
      : `
- Prefer a topical phrase grounded in the source content
- Do not start with vague words like excerpt, notes, document, or paper`

  return `Write a short notebook title for this collection of sources.
Source names: ${args.labelList}
Rules:
- Synthesize the central topic or relationship across all sources
- Use the language used by the sources
- Prefer a concise topical phrase: use as few words as the topic needs, and stay within about 10 words
- Short titles are better when the sources support them; do not pad to a word count
- Not a sentence or a list of source names
- No URLs, hostnames, file paths, filenames, or document codes
- Ignore branding slogans and generic marketing copy${multiSourceRules}

${args.corpus}`
}

/**
 * Title refresh core: Source snapshots + generation port → propose result.
 */
export async function titleFromSourceSnapshots(args: {
  sources: TitleSourceSnapshot[]
  generateTitle: TitleGenerator
}): Promise<TitleFromSourcesResult> {
  const sources = args.sources.slice(0, LIMITS.sourcesPerNotebook)
  const excerpts: string[] = []
  const digests: string[] = []
  const includedSourceIds: string[] = []
  const sourceLabels: string[] = []
  const excerptBudget = perSourceExcerptBudget(Math.max(sources.length, 1))

  for (const source of sources) {
    const label = preferredSourceLabel(source)

    if (label) {
      sourceLabels.push(label)
    }

    const text = source.text.trim()

    if (!text) {
      continue
    }

    const heading = label || source.title || "Untitled source"
    const excerpt = text.slice(0, excerptBudget)

    excerpts.push(`### source:${source.sourceId} — ${heading}\n${excerpt}`)
    digests.push(excerpt)
    includedSourceIds.push(source.sourceId)
  }

  const corpus = excerpts.join("\n\n").slice(0, CORPUS_CHAR_BUDGET)
  const sourceCount = Math.max(excerpts.length, sources.length)
  const labelList = sourceLabels.join("; ") || "(none usable)"

  let modelOutput: { title: string } | null = null

  if (corpus.trim()) {
    try {
      const generated = await args.generateTitle.generateOnce({
        prompt: buildTitlePrompt({ sourceCount, labelList, corpus }),
      })

      if (generated) {
        modelOutput = {
          title: cleanGeneratedTitle(generated.title),
        }
      }
    } catch (error) {
      console.error(
        "[title-refresh]",
        error instanceof Error ? error.message : "Unknown title error",
      )
    }
  }

  return {
    proposal: proposeNotebookTitle({
      sourceLabels,
      digests,
      modelOutput,
    }),
    includedSourceIds,
  }
}
