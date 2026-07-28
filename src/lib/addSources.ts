import { nanoid } from "nanoid"
import type { Id } from "src/convex/_generated/dataModel"
import { describeRejectedFile, isAcceptedUpload } from "src/lib/fileTypes"
import { startSourceIngest } from "src/lib/ingestClient"
import { LIMITS } from "src/lib/limits"
import {
  beginCreatingSource,
  completeCreatingSource,
  failCreatingSource,
  rememberSourceRowKey,
  updateUploadingSources,
} from "src/lib/pendingSources"
import { titleFromFilename } from "src/lib/sourceTitle"
import {
  addedAtForBatch,
  markUploadingSourceCreated,
  removeUploadingSource,
  type UploadingSource,
} from "src/lib/uploadingSources"

export type AddSourcesArgs = {
  notebookId: Id<"notebooks">
  /** Current ready + uploading count used for capacity checks. */
  sourceCount: number
  urls?: string[]
  texts?: string[]
  files?: File[]
  generateUploadUrl?: () => Promise<string>
}

/**
 * Client Add Sources module: pending rows, storage upload, ingest POST, LIMITS.
 */
export async function addSources(args: AddSourcesArgs) {
  const notices: string[] = []

  for (const url of args.urls ?? []) {
    beginCreatingSource(args.notebookId)

    try {
      const sourceId = await startSourceIngest({
        action: "create",
        kind: "url",
        notebookId: args.notebookId,
        url,
      })
      completeCreatingSource(args.notebookId, sourceId)
    } catch (error) {
      failCreatingSource(args.notebookId)
      throw error
    }
  }

  for (const text of args.texts ?? []) {
    beginCreatingSource(args.notebookId)

    try {
      const sourceId = await startSourceIngest({
        action: "create",
        kind: "text",
        notebookId: args.notebookId,
        text,
      })
      completeCreatingSource(args.notebookId, sourceId)
    } catch (error) {
      failCreatingSource(args.notebookId)
      throw error
    }
  }

  const files = args.files ?? []

  if (!files.length) {
    return notices.length ? notices.join(" ") : null
  }

  if (!args.generateUploadUrl) {
    throw new Error("Couldn't upload files without a storage upload URL.")
  }

  const remaining = Math.max(0, LIMITS.sourcesPerNotebook - args.sourceCount)
  const accepted: File[] = []
  const rejected: string[] = []

  for (const file of files) {
    if (accepted.length >= remaining) {
      rejected.push(
        `${file.name} (notebook already has ${LIMITS.sourcesPerNotebook} sources)`,
      )
      continue
    }

    if (file.size > LIMITS.maxUploadBytes) {
      rejected.push(
        `${file.name} (over ${Math.round(LIMITS.maxUploadBytes / (1024 * 1024))} MB)`,
      )
      continue
    }

    if (!isAcceptedUpload(file.name, file.type)) {
      rejected.push(describeRejectedFile(file.name))
      continue
    }

    accepted.push(file)
  }

  if (rejected.length) {
    notices.push(`Some files were skipped: ${rejected.slice(0, 3).join("; ")}`)
  }

  const addedAtBase = Date.now()
  const pending = accepted.map(
    (file, index): UploadingSource => ({
      localId: nanoid(),
      filename: file.name,
      title: titleFromFilename(file.name),
      addedAt: addedAtForBatch(index, accepted.length, addedAtBase),
    }),
  )

  if (pending.length) {
    updateUploadingSources(args.notebookId, (current) => [
      ...pending,
      ...current,
    ])
  }

  for (const [index, file] of accepted.entries()) {
    const pendingEntry = pending[index]

    if (!pendingEntry) {
      continue
    }

    try {
      const uploadUrl = await args.generateUploadUrl()
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      })

      if (!response.ok) {
        throw new Error(`Couldn't upload ${file.name}.`)
      }

      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">
      }
      const sourceId = await startSourceIngest({
        action: "create",
        kind: "file",
        notebookId: args.notebookId,
        storageId,
        filename: file.name,
        mimeType: file.type || undefined,
        createdAt: pendingEntry.addedAt,
      })
      rememberSourceRowKey(args.notebookId, sourceId, pendingEntry.localId)
      updateUploadingSources(args.notebookId, (current) =>
        markUploadingSourceCreated(current, pendingEntry.localId, sourceId),
      )
    } catch (error) {
      updateUploadingSources(args.notebookId, (current) =>
        removeUploadingSource(current, pendingEntry.localId),
      )

      for (const leftover of pending.slice(index + 1)) {
        updateUploadingSources(args.notebookId, (current) =>
          removeUploadingSource(current, leftover.localId),
        )
      }

      throw error
    }
  }

  return notices.length ? notices.join(" ") : null
}
