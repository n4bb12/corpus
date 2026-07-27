import type { FunctionReturnType } from "convex/server"
import type { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import {
  applySourceBoundaryPlan,
  planSourceBoundaryFromEntries,
  readySelectedSourceIds,
  type SourceBoundaryPlan,
  shouldCreateSourceRevision,
} from "src/lib/chatHistory"

type ChatList = NonNullable<FunctionReturnType<typeof api.chat.list>>
type ChatListEntry = ChatList[number]
type SourceList = NonNullable<
  FunctionReturnType<typeof api.sources.listByNotebook>
>

export function patchChatEntriesForSourceSelection({
  entries,
  previousSources,
  nextSources,
  chatSelectionHash,
  notebookId,
  chatEpoch,
}: {
  entries: ChatList
  previousSources: SourceList
  nextSources: SourceList
  chatSelectionHash?: string | null
  notebookId: Id<"notebooks">
  chatEpoch: number
}) {
  const previousIds = readySelectedSourceIds(previousSources)
  const nextIds = readySelectedSourceIds(nextSources)

  if (!shouldCreateSourceRevision(previousIds, nextIds)) {
    return entries
  }

  const plan = planSourceBoundaryFromEntries(entries, {
    previousIds,
    nextIds,
    chatSelectionHash,
  })

  return applySourceBoundaryPlan(entries, plan, (insertPlan) =>
    createOptimisticSourceBoundary({
      notebookId,
      chatEpoch,
      plan: insertPlan,
    }),
  )
}

function createOptimisticSourceBoundary({
  notebookId,
  chatEpoch,
  plan,
}: {
  notebookId: Id<"notebooks">
  chatEpoch: number
  plan: Extract<SourceBoundaryPlan, { type: "insert" }>
}): ChatListEntry {
  const now = Date.now()

  return {
    _id: `optimistic_boundary:${plan.selectionHash}` as Id<"chatEntries">,
    _creationTime: now,
    notebookId,
    chatEpoch,
    kind: "sourceBoundary",
    selectionHash: plan.selectionHash,
    activeSourceCount: plan.activeSourceCount,
    createdAt: now,
    citations: [],
  }
}
