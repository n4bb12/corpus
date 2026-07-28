import { nanoid } from "nanoid"
import type { Id } from "src/convex/_generated/dataModel"
import { describeRejectedFile, isAcceptedUpload } from "src/lib/fileTypes"
import { startSourceIngest } from "src/lib/ingestClient"
import { LIMITS } from "src/lib/limits"
import {
  rememberSourceRowKey,
  updateUploadingSources,
} from "src/lib/pendingSources"
import {
  titleFromFilename,
  titleFromPastedText,
  titleFromUrl,
} from "src/lib/sourceTitle"
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

function pushPendingSource(
  notebookId: Id<"notebooks">,
  pending: UploadingSource,
) {
  updateUploadingSources(notebookId, (current) => [pending, ...current])
}

function stampPendingSource(
  notebookId: Id<"notebooks">,
  localId: string,
  sourceId: Id<"sources">,
) {
  rememberSourceRowKey(notebookId, sourceId, localId)
  updateUploadingSources(notebookId, (current) =>
    markUploadingSourceCreated(current, localId, sourceId),
  )
}

function dropPendingSource(notebookId: Id<"notebooks">, localId: string) {
  updateUploadingSources(notebookId, (current) =>
    removeUploadingSource(current, localId),
  )
}

/**
 * Client Add Sources module: pending rows, storage upload, ingest POST, LIMITS.
 */
export async function addSources(args: AddSourcesArgs) {
  const notices: string[] = []

  for (const url of args.urls ?? []) {
    const localId = nanoid()
    const addedAt = Date.now()
    const pending: UploadingSource = {
      localId,
      filename: url,
      title: titleFromUrl(url),
      addedAt,
      kind: "url",
    }

    pushPendingSource(args.notebookId, pending)

    try {
      const sourceId = await startSourceIngest({
        action: "create",
        kind: "url",
        notebookId: args.notebookId,
        url,
        createdAt: addedAt,
      })
      stampPendingSource(args.notebookId, localId, sourceId)
    } catch (error) {
      dropPendingSource(args.notebookId, localId)
      throw error
    }
  }

  for (const text of args.texts ?? []) {
    const localId = nanoid()
    const addedAt = Date.now()
    const title = titleFromPastedText(text)
    const pending: UploadingSource = {
      localId,
      filename: title,
      title,
      addedAt,
      kind: "text",
    }

    pushPendingSource(args.notebookId, pending)

    try {
      const sourceId = await startSourceIngest({
        action: "create",
        kind: "text",
        notebookId: args.notebookId,
        text,
        createdAt: addedAt,
      })
      stampPendingSource(args.notebookId, localId, sourceId)
    } catch (error) {
      dropPendingSource(args.notebookId, localId)
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
      kind: "file",
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
      stampPendingSource(args.notebookId, pendingEntry.localId, sourceId)
    } catch (error) {
      dropPendingSource(args.notebookId, pendingEntry.localId)

      for (const leftover of pending.slice(index + 1)) {
        dropPendingSource(args.notebookId, leftover.localId)
      }

      throw error
    }
  }

  return notices.length ? notices.join(" ") : null
}
