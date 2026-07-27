import { useMutation } from "convex/react"
import { useState } from "react"
import { uploadSourceFiles } from "src/components/sources/uploadSourceFiles"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { updateUploadingSources } from "src/lib/pendingSources"
import {
  markUploadingSourceCreated,
  removeUploadingSource,
} from "src/lib/uploadingSources"

export function useSourceUpload({
  notebookId,
  sourceCount,
  uploadingCount,
}: {
  notebookId: Id<"notebooks">
  sourceCount: number
  uploadingCount: number
}) {
  const generateUploadUrl = useMutation(api.sources.generateUploadUrl)
  const [dragging, setDragging] = useState(false)
  const [uploadNotice, setUploadNotice] = useState<string | null>(null)

  async function uploadFiles(files: File[]) {
    try {
      const notice = await uploadSourceFiles({
        files,
        notebookId,
        sourceCount: sourceCount + uploadingCount,
        generateUploadUrl: async () => generateUploadUrl({}),
        onPending: (pending) => {
          updateUploadingSources(notebookId, (current) => [
            ...pending,
            ...current,
          ])
        },
        onCreated: (localId, sourceId) => {
          updateUploadingSources(notebookId, (current) =>
            markUploadingSourceCreated(current, localId, sourceId),
          )
        },
        onFailed: (localId) => {
          updateUploadingSources(notebookId, (current) =>
            removeUploadingSource(current, localId),
          )
        },
      })
      setUploadNotice(notice)
    } catch (error) {
      setUploadNotice(
        error instanceof Error ? error.message : "Couldn't upload that file.",
      )
    }
  }

  return {
    dragging,
    setDragging,
    uploadNotice,
    uploadFiles,
  }
}
