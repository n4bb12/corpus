import { nanoid } from "nanoid"
import type { Id } from "src/convex/_generated/dataModel"
import { describeRejectedFile, isAcceptedUpload } from "src/lib/fileTypes"
import { startSourceIngest } from "src/lib/ingestClient"
import { titleFromFilename } from "src/lib/sourceTitle"
import { addedAtForBatch, type UploadingSource } from "src/lib/uploadingSources"

export type UploadSourceFilesArgs = {
  files: File[]
  notebookId: Id<"notebooks">
  sourceCount: number
  generateUploadUrl: () => Promise<string>
  onPending?: (pending: UploadingSource[]) => void
  onCreated?: (localId: string, sourceId: Id<"sources">) => void
  onFailed?: (localId: string) => void
}

export async function uploadSourceFiles({
  files,
  notebookId,
  sourceCount,
  generateUploadUrl,
  onPending,
  onCreated,
  onFailed,
}: UploadSourceFilesArgs) {
  const remaining = Math.max(0, 20 - sourceCount)
  const accepted: File[] = []
  const rejected: string[] = []

  for (const file of files) {
    if (accepted.length >= remaining) {
      rejected.push(`${file.name} (notebook already has 20 sources)`)
      continue
    }

    if (file.size > 20 * 1024 * 1024) {
      rejected.push(`${file.name} (over 20 MB)`)
      continue
    }

    if (!isAcceptedUpload(file.name, file.type)) {
      rejected.push(describeRejectedFile(file.name))
      continue
    }

    accepted.push(file)
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
    onPending?.(pending)
  }

  for (const [index, file] of accepted.entries()) {
    const pendingEntry = pending[index]

    if (!pendingEntry) {
      continue
    }

    try {
      const uploadUrl = await generateUploadUrl()
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
        notebookId,
        storageId,
        filename: file.name,
        mimeType: file.type || undefined,
        createdAt: pendingEntry.addedAt,
      })
      onCreated?.(pendingEntry.localId, sourceId)
    } catch (error) {
      onFailed?.(pendingEntry.localId)

      for (const leftover of pending.slice(index + 1)) {
        onFailed?.(leftover.localId)
      }

      throw error
    }
  }

  return rejected.length
    ? `Some files were skipped: ${rejected.slice(0, 3).join("; ")}`
    : null
}
