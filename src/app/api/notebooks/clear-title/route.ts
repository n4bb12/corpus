import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { fetchAuthMutation, getToken } from "src/lib/authServer"
import { scheduleBackground } from "src/server/scheduleBackground"
import { refreshNotebookTitle } from "src/server/titles/refreshNotebookTitle"
import { z } from "zod"

export const maxDuration = 300
export const preferredRegion = "fra1"

const bodySchema = z.object({
  notebookId: z.string(),
})

export async function POST(request: Request) {
  const token = await getToken()

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: z.infer<typeof bodySchema>

  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 })
  }

  try {
    const result = (await fetchAuthMutation(api.notebooks.rename, {
      notebookId: body.notebookId as Id<"notebooks">,
      title: "",
    })) as {
      cleared?: boolean
      notebookId: Id<"notebooks">
      titleRefreshGeneration?: number | null
    }

    if (result?.cleared && typeof result.titleRefreshGeneration === "number") {
      scheduleBackground(
        refreshNotebookTitle({
          notebookId: String(result.notebookId),
          generation: result.titleRefreshGeneration,
          token,
        }),
      )
    }

    return Response.json({ ok: true }, { status: 202 })
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Couldn't clear the notebook title.",
      },
      { status: 400 },
    )
  }
}
