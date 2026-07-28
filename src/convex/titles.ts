import { v } from "convex/values"
import {
  shouldSkipTitleRefresh,
  sourceHasTitleEvidence,
} from "src/lib/notebookTitlePolicy"
import type { Id } from "./_generated/dataModel"
import { type MutationCtx, mutation } from "./_generated/server"
import { requireNotebookOwner } from "./lib/ownership"

/**
 * Bump titleRefreshGeneration and set pending. Returns the generation for the
 * server Title refresh orchestrator. Does not run the LLM.
 *
 * With zero title-eligible sources, clears to placeholder/idle and returns
 * null so callers can skip the orchestrator.
 */
export async function scheduleNotebookTitleRefresh(
  ctx: MutationCtx,
  notebookId: Id<"notebooks">,
) {
  const notebook = await ctx.db.get(notebookId)

  if (!notebook || shouldSkipTitleRefresh(notebook.titleOrigin)) {
    return null
  }

  const sources = await ctx.db
    .query("sources")
    .withIndex("by_notebook_createdAt", (q) => q.eq("notebookId", notebookId))
    .collect()

  const generation = (notebook.titleRefreshGeneration ?? 0) + 1
  const now = Date.now()

  if (!sources.some(sourceHasTitleEvidence)) {
    await ctx.db.patch(notebook._id, {
      title: "",
      titleOrigin: "placeholder",
      titleGenerationState: "idle",
      titleRefreshGeneration: generation,
      updatedAt: now,
    })

    return null
  }

  await ctx.db.patch(notebook._id, {
    titleRefreshGeneration: generation,
    titleGenerationState: "pending",
    updatedAt: now,
  })

  return generation
}

export const scheduleTitleRefresh = mutation({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    await requireNotebookOwner(ctx, args.notebookId)

    const generation = await scheduleNotebookTitleRefresh(ctx, args.notebookId)

    return generation === null ? null : { generation }
  },
})
