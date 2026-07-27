export type ChatEntryLike = {
  kind: "message" | "sourceBoundary"
  role?: "user" | "assistant"
  status?: "pending" | "streaming" | "complete" | "failed" | "canceled"
  exchangeId?: string
  content?: string
  createdAt: number
}

export type OptimisticChatSubmission = {
  content: string
  existingMessageCount: number
}

export function getOptimisticUserPrompt(
  entries: ChatEntryLike[] | undefined,
  submission: OptimisticChatSubmission | null,
) {
  if (!submission) {
    return null
  }

  const messageCount =
    entries?.filter((entry) => entry.kind === "message").length ?? 0

  return messageCount > submission.existingMessageCount
    ? null
    : submission.content
}

/** True until Convex publishes a pending/streaming assistant for this turn. */
export function shouldShowOptimisticProgress(
  entries: ChatEntryLike[] | undefined,
  progressLabel: string | null,
  retryAssistantId?: string | null,
) {
  if (!progressLabel || retryAssistantId) {
    return false
  }

  return !entries?.some(
    (entry) =>
      entry.kind === "message" &&
      entry.role === "assistant" &&
      (entry.status === "pending" || entry.status === "streaming"),
  )
}

export function latestBoundaryIndex(entries: ChatEntryLike[]) {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (entries[index]?.kind === "sourceBoundary") {
      return index
    }
  }

  return -1
}

/** Complete user/assistant pairs after the latest source boundary, capped. */
export function successfulPairsAfterBoundary(
  entries: ChatEntryLike[],
  maxPairs: number,
) {
  const boundary = latestBoundaryIndex(entries)
  const window = entries.slice(boundary + 1)
  const pairs: Array<{ user: ChatEntryLike; assistant: ChatEntryLike }> = []
  const byExchange = new Map<
    string,
    { user?: ChatEntryLike; assistant?: ChatEntryLike }
  >()

  for (const entry of window) {
    if (entry.kind !== "message" || !entry.exchangeId) {
      continue
    }

    const bucket = byExchange.get(entry.exchangeId) ?? {}

    if (entry.role === "user") {
      bucket.user = entry
    }

    if (entry.role === "assistant" && entry.status === "complete") {
      bucket.assistant = entry
    }

    byExchange.set(entry.exchangeId, bucket)
  }

  for (const entry of window) {
    if (
      entry.kind !== "message" ||
      entry.role !== "assistant" ||
      !entry.exchangeId
    ) {
      continue
    }

    const bucket = byExchange.get(entry.exchangeId)

    if (!bucket?.user || !bucket.assistant) {
      continue
    }

    if (pairs.some((pair) => pair.assistant.exchangeId === entry.exchangeId)) {
      continue
    }

    pairs.push({ user: bucket.user, assistant: bucket.assistant })
  }

  return pairs.slice(-maxPairs)
}

export function canRetryLatestAssistant(entries: ChatEntryLike[]) {
  const messages = entries.filter((entry) => entry.kind === "message")
  const latest = messages.at(-1)

  if (latest?.role !== "assistant") {
    return false
  }

  if (latest.status === "failed" || latest.status === "canceled") {
    return true
  }

  // Recover turns that finished with no visible answer (e.g. provider errors
  // previously finalized as empty complete).
  return latest.status === "complete" && !latest.content?.trim()
}

export type SourceRevisionEvent = {
  selectedReadySourceIds: string[]
  revision: number
}

export function hashSourceSelection(ids: string[]) {
  return [...ids].sort().join("\0")
}

export function sourceIdsFromSelectionHash(hash: string | null | undefined) {
  if (!hash) {
    return []
  }

  return hash.split("\0").filter(Boolean)
}

export function shouldCreateSourceRevision(
  previousIds: string[],
  nextIds: string[],
) {
  return hashSourceSelection(previousIds) !== hashSourceSelection(nextIds)
}

export type SourceBoundaryPlan =
  | { type: "none"; selectionHash: string }
  | { type: "insert"; selectionHash: string; activeSourceCount: number }
  | { type: "update"; selectionHash: string; activeSourceCount: number }
  | { type: "remove"; selectionHash: string }

/** Decide insert/update/remove/none for a source-boundary chat entry. */
export function planSourceBoundary(args: {
  previousIds: string[]
  nextIds: string[]
  chatSelectionHash?: string | null
  hasSuccessfulExchange: boolean
  activeStreaming: boolean
  trailingKind: "sourceBoundary" | "message" | null
}): SourceBoundaryPlan {
  const selectionHash = hashSourceSelection(args.nextIds)
  const previousHash = hashSourceSelection(args.previousIds)

  if (
    !args.hasSuccessfulExchange ||
    args.activeStreaming ||
    selectionHash === previousHash
  ) {
    return { type: "none", selectionHash }
  }

  const baselineHash = args.chatSelectionHash || previousHash

  if (selectionHash === baselineHash) {
    if (args.trailingKind === "sourceBoundary") {
      return { type: "remove", selectionHash }
    }

    return { type: "none", selectionHash }
  }

  if (args.trailingKind === "sourceBoundary") {
    return {
      type: "update",
      selectionHash,
      activeSourceCount: args.nextIds.length,
    }
  }

  return {
    type: "insert",
    selectionHash,
    activeSourceCount: args.nextIds.length,
  }
}

export type SourceBoundaryEntryLike = {
  _id: string
  kind: "message" | "sourceBoundary"
  role?: "user" | "assistant"
  status?: "pending" | "streaming" | "complete" | "failed" | "canceled"
  activeSourceCount?: number
  selectionHash?: string
  createdAt: number
}

export function readySelectedSourceIds(
  sources: Array<{
    _id: string
    selected: boolean
    processingState: string
    deletedAt?: number
  }>,
) {
  return sources
    .filter(
      (source) =>
        !source.deletedAt &&
        source.selected &&
        source.processingState === "ready",
    )
    .map((source) => source._id)
}

export function planSourceBoundaryFromEntries(
  entries: SourceBoundaryEntryLike[],
  args: {
    previousIds: string[]
    nextIds: string[]
    chatSelectionHash?: string | null
  },
) {
  const hasSuccessfulExchange = entries.some(
    (entry) =>
      entry.kind === "message" &&
      entry.role === "assistant" &&
      entry.status === "complete",
  )
  const activeStreaming = entries.some(
    (entry) =>
      entry.kind === "message" &&
      entry.role === "assistant" &&
      (entry.status === "pending" || entry.status === "streaming"),
  )
  const trailing = [...entries]
    .reverse()
    .find(
      (entry) => entry.kind === "sourceBoundary" || entry.kind === "message",
    )

  return planSourceBoundary({
    previousIds: args.previousIds,
    nextIds: args.nextIds,
    chatSelectionHash: args.chatSelectionHash,
    hasSuccessfulExchange,
    activeStreaming,
    trailingKind:
      trailing?.kind === "sourceBoundary" || trailing?.kind === "message"
        ? trailing.kind
        : null,
  })
}

export function applySourceBoundaryPlan<T extends SourceBoundaryEntryLike>(
  entries: T[],
  plan: SourceBoundaryPlan,
  createBoundary: (plan: Extract<SourceBoundaryPlan, { type: "insert" }>) => T,
) {
  if (plan.type === "none") {
    return entries
  }

  const trailingIndex = [...entries]
    .map((entry, index) => ({ entry, index }))
    .reverse()
    .find(
      ({ entry }) =>
        entry.kind === "sourceBoundary" || entry.kind === "message",
    )?.index

  if (plan.type === "remove") {
    if (
      typeof trailingIndex !== "number" ||
      entries[trailingIndex]?.kind !== "sourceBoundary"
    ) {
      return entries
    }

    return entries.filter((_, index) => index !== trailingIndex)
  }

  if (plan.type === "update") {
    if (
      typeof trailingIndex !== "number" ||
      entries[trailingIndex]?.kind !== "sourceBoundary"
    ) {
      return entries
    }

    return entries.map((entry, index) =>
      index === trailingIndex
        ? {
            ...entry,
            selectionHash: plan.selectionHash,
            activeSourceCount: plan.activeSourceCount,
          }
        : entry,
    )
  }

  return [...entries, createBoundary(plan)]
}
