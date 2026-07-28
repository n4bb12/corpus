import {
  fallbackNotebookTitle,
  isSingleSourceNotebookTitle,
  isUsableNotebookTitle,
} from "src/lib/notebookTitleQuality"
import { formatTitle } from "src/lib/sourceTitle"

export type ProposeNotebookTitleInput = {
  sourceLabels: string[]
  digests: string[]
  modelOutput: { title: string } | null
}

export type ProposeNotebookTitleResult =
  | { kind: "title"; title: string }
  | { kind: "fallback"; title: string }
  | { kind: "failed" }

function cleanGeneratedTitle(raw: string) {
  return formatTitle(raw.replace(/^["'`“”]+|["'`“”]+$/g, ""))
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
 * Pure Title propose: model output + corpus labels → accept, fallback, or failed.
 */
export function proposeNotebookTitle(
  input: ProposeNotebookTitleInput,
): ProposeNotebookTitleResult {
  const title = cleanGeneratedTitle(input.modelOutput?.title ?? "")

  if (acceptNotebookTitle(title, input.sourceLabels)) {
    return { kind: "title", title }
  }

  const fallbackLabel = fallbackNotebookTitle({
    sourceLabels: input.sourceLabels,
    digests: input.digests,
  })

  if (fallbackLabel && acceptNotebookTitle(fallbackLabel, input.sourceLabels)) {
    return { kind: "fallback", title: fallbackLabel }
  }

  return { kind: "failed" }
}

export { acceptNotebookTitle, cleanGeneratedTitle }
