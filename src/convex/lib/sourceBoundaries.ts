import {
  hashSourceSelection,
  planSourceBoundary,
  shouldCreateSourceRevision,
  sourceIdsFromSelectionHash,
} from "src/lib/chatHistory"

export async function getReadySelectedIds(
  ctx: { db: any },
  notebookId: string,
) {
  const sources = await ctx.db
    .query("sources")
    .withIndex("by_notebook_createdAt", (q: any) =>
      q.eq("notebookId", notebookId),
    )
    .collect()

  return sources
    .filter(
      (source: {
        deletedAt?: number
        selected: boolean
        processingState: string
      }) =>
        !source.deletedAt &&
        source.selected &&
        source.processingState === "ready",
    )
    .map((source: { _id: string }) => source._id as string)
}

export async function applySourceSelectionBoundary(
  ctx: { db: any },
  notebook: {
    _id: any
    chatEpoch: number
    sourceRevision: number
    chatSelectionHash?: string
  },
  previousIds: string[],
  nextIds: string[],
) {
  const messages = await ctx.db
    .query("chatEntries")
    .withIndex("by_notebook_epoch_createdAt", (q: any) =>
      q.eq("notebookId", notebook._id).eq("chatEpoch", notebook.chatEpoch),
    )
    .collect()

  const hasSuccessfulExchange = messages.some(
    (entry: { kind: string; role?: string; status?: string }) =>
      entry.kind === "message" &&
      entry.role === "assistant" &&
      entry.status === "complete",
  )

  const activeStreaming = messages.some(
    (entry: { kind: string; role?: string; status?: string }) =>
      entry.kind === "message" &&
      entry.role === "assistant" &&
      (entry.status === "pending" || entry.status === "streaming"),
  )

  const trailing = [...messages]
    .reverse()
    .find(
      (entry: { kind: string }) =>
        entry.kind === "sourceBoundary" || entry.kind === "message",
    )

  const plan = planSourceBoundary({
    previousIds,
    nextIds,
    chatSelectionHash: notebook.chatSelectionHash,
    hasSuccessfulExchange,
    activeStreaming,
    trailingKind:
      trailing?.kind === "sourceBoundary" || trailing?.kind === "message"
        ? trailing.kind
        : null,
  })

  const now = Date.now()
  const baselineHash =
    notebook.chatSelectionHash || hashSourceSelection(previousIds)

  if (plan.type === "none") {
    return {
      sourceRevision: notebook.sourceRevision,
      chatSelectionHash: notebook.chatSelectionHash,
    }
  }

  if (plan.type === "remove") {
    if (trailing?.kind === "sourceBoundary") {
      await ctx.db.delete(trailing._id)
    }

    return {
      sourceRevision: notebook.sourceRevision,
      chatSelectionHash: baselineHash,
    }
  }

  const nextRevision = notebook.sourceRevision + 1
  const chatSelectionHash = notebook.chatSelectionHash || baselineHash

  if (plan.type === "update" && trailing?.kind === "sourceBoundary") {
    await ctx.db.patch(trailing._id, {
      sourceRevision: nextRevision,
      selectionHash: plan.selectionHash,
      activeSourceCount: plan.activeSourceCount,
    })
  } else {
    await ctx.db.insert("chatEntries", {
      notebookId: notebook._id,
      chatEpoch: notebook.chatEpoch,
      kind: "sourceBoundary",
      sourceRevision: nextRevision,
      selectionHash: plan.selectionHash,
      activeSourceCount: plan.activeSourceCount,
      createdAt: now,
    })
  }

  return {
    sourceRevision: nextRevision,
    chatSelectionHash,
  }
}

/**
 * After a chat turn finishes, insert a deferred source boundary when the user
 * changed selection while the assistant was still streaming (those toggles are
 * ignored mid-stream). Keeps chatSelectionHash as the ask-time baseline.
 */
export async function reconcileSourceBoundaryAfterChatTurn(
  ctx: { db: any },
  notebook: {
    _id: any
    chatEpoch: number
    sourceRevision: number
    chatSelectionHash?: string
  },
) {
  const nextIds = await getReadySelectedIds(ctx, notebook._id)
  const nextHash = hashSourceSelection(nextIds)

  if (!notebook.chatSelectionHash) {
    return {
      sourceRevision: notebook.sourceRevision,
      chatSelectionHash: nextHash,
    }
  }

  if (notebook.chatSelectionHash === nextHash) {
    return {
      sourceRevision: notebook.sourceRevision,
      chatSelectionHash: notebook.chatSelectionHash,
    }
  }

  const previousIds = sourceIdsFromSelectionHash(notebook.chatSelectionHash)

  if (!shouldCreateSourceRevision(previousIds, nextIds)) {
    return {
      sourceRevision: notebook.sourceRevision,
      chatSelectionHash: notebook.chatSelectionHash,
    }
  }

  return applySourceSelectionBoundary(ctx, notebook, previousIds, nextIds)
}
