import type { Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { authComponent } from "../auth"

type Ctx = QueryCtx | MutationCtx

export async function getUserOrNull(ctx: Ctx) {
  const user = await authComponent.safeGetAuthUser(ctx)
  return user ?? null
}

export async function requireUser(ctx: Ctx) {
  const user = await getUserOrNull(ctx)

  if (!user) {
    throw new Error("You need to sign in to continue.")
  }

  return user
}

export async function requireNotebookOwner(
  ctx: Ctx,
  notebookId: Id<"notebooks">,
) {
  const user = await requireUser(ctx)
  const notebook = await ctx.db.get(notebookId)

  if (!notebook || notebook.deletedAt || notebook.ownerId !== user._id) {
    throw new Error("Notebook not found.")
  }

  return { user, notebook }
}

export async function requireSourceOwner(ctx: Ctx, sourceId: Id<"sources">) {
  const user = await requireUser(ctx)
  const source = await ctx.db.get(sourceId)

  if (!source || source.deletedAt || source.ownerId !== user._id) {
    throw new Error("Source not found.")
  }

  const notebook = await ctx.db.get(source.notebookId)

  if (!notebook || notebook.deletedAt || notebook.ownerId !== user._id) {
    throw new Error("Notebook not found.")
  }

  return { user, source, notebook }
}
