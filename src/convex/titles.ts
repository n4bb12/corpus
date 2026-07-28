import { v } from "convex/values"
import { shouldSkipTitleRefresh } from "src/lib/notebookTitlePolicy"
import type { Id } from "./_generated/dataModel"
import { type MutationCtx, mutation } from "./_generated/server"
import { requireNotebookOwner } from "./lib/ownership"

/**
 * Bump titleRefreshGeneration and set pending. Returns the generation for the
 * server Title refresh orchestrator. Does not run the LLM.
 */
export async function scheduleNotebookTitleRefresh(
  ctx: MutationCtx,
  notebookId: Id<"notebooks">,
) {
  const notebook = await ctx.db.get(notebookId)

  if (!notebook || shouldSkipTitleRefresh(notebook.titleOrigin)) {
    return null
  }

  const generation = (notebook.titleRefreshGeneration ?? 0) + 1

  await ctx.db.patch(notebook._id, {
    titleRefreshGeneration: generation,
    titleGenerationState: "pending",
    updatedAt: Date.now(),
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
