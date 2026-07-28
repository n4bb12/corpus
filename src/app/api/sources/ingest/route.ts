import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { fetchAuthMutation, getToken } from "src/lib/authServer"
import { formatUserError } from "src/lib/userError"
import { scheduleBackground } from "src/server/scheduleBackground"
import { z } from "zod"

export const maxDuration = 300
export const preferredRegion = "fra1"

const createUrlSchema = z.object({
  action: z.literal("create"),
  kind: z.literal("url"),
  notebookId: z.string(),
  url: z.string(),
  createdAt: z.number().optional(),
})

const createTextSchema = z.object({
  action: z.literal("create"),
  kind: z.literal("text"),
  notebookId: z.string(),
  text: z.string(),
  createdAt: z.number().optional(),
})

const createFileSchema = z.object({
  action: z.literal("create"),
  kind: z.literal("file"),
  notebookId: z.string(),
  storageId: z.string(),
  filename: z.string(),
  mimeType: z.string().optional(),
  createdAt: z.number().optional(),
})

const retrySchema = z.object({
  action: z.literal("retry"),
  sourceId: z.string(),
})

const bodySchema = z.union([
  createUrlSchema,
  createTextSchema,
  createFileSchema,
  retrySchema,
])

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
    let sourceId: Id<"sources">

    if (body.action === "retry") {
      sourceId = body.sourceId as Id<"sources">
      await fetchAuthMutation(api.sources.retry, { sourceId })
    } else if (body.kind === "url") {
      sourceId = (await fetchAuthMutation(api.sources.addUrl, {
        notebookId: body.notebookId as Id<"notebooks">,
        url: body.url,
        createdAt: body.createdAt,
      })) as Id<"sources">
    } else if (body.kind === "text") {
      sourceId = (await fetchAuthMutation(api.sources.addText, {
        notebookId: body.notebookId as Id<"notebooks">,
        text: body.text,
        createdAt: body.createdAt,
      })) as Id<"sources">
    } else {
      sourceId = (await fetchAuthMutation(api.sources.addFile, {
        notebookId: body.notebookId as Id<"notebooks">,
        storageId: body.storageId as Id<"_storage">,
        filename: body.filename,
        mimeType: body.mimeType,
        createdAt: body.createdAt,
      })) as Id<"sources">
    }

    const { processSourcePipeline } = await import(
      "src/server/sources/processSource"
    )

    scheduleBackground(processSourcePipeline(sourceId, token))

    return Response.json({ sourceId }, { status: 202 })
  } catch (error) {
    return Response.json(
      {
        error: formatUserError(error, "Couldn't add this source."),
      },
      { status: 400 },
    )
  }
}
