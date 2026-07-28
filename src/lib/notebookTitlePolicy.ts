export type NotebookTitleOrigin = "placeholder" | "generated" | "manual"

export type NotebookTitleGenerationState =
  | "idle"
  | "pending"
  | "complete"
  | "failed"

/** Coalesce burst ready/delete/clear events into one title refresh. */
export const TITLE_REFRESH_DEBOUNCE_MS = 800

/** Manual titles never refresh from digests. */
export function shouldSkipTitleRefresh(titleOrigin: NotebookTitleOrigin) {
  return titleOrigin === "manual"
}

/** Auto titles may be overwritten while still placeholder or previously generated. */
export function canApplyGeneratedTitle(titleOrigin: NotebookTitleOrigin) {
  return titleOrigin === "placeholder" || titleOrigin === "generated"
}

/** Empty rename returns ownership to automatic naming. */
export function patchForClearedNotebookTitle() {
  return {
    title: "",
    titleOrigin: "placeholder" as const,
    titleGenerationState: "pending" as const,
  }
}

/** Latest-wins: ignore starting a refresh if a newer one was scheduled. */
export function isStaleTitleRefresh(
  currentGeneration: number | undefined,
  scheduledGeneration: number,
) {
  return (currentGeneration ?? 0) !== scheduledGeneration
}

/** Source rows that can contribute digest or markdown evidence to a title. */
export function sourceHasTitleEvidence(source: {
  deletedAt?: number
  processingState: string
  digestStatus?: string
  digestText?: string
  normalizedStorageId?: string
}) {
  if (source.deletedAt || source.processingState === "failed") {
    return false
  }

  const hasDigest =
    (source.digestStatus === "pending" || source.digestStatus === "ready") &&
    typeof source.digestText === "string" &&
    !!source.digestText.trim()

  if (hasDigest) {
    return true
  }

  return source.processingState === "ready" && !!source.normalizedStorageId
}
