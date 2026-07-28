import { useMutation } from "convex/react"
import { useState } from "react"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { addSources } from "src/lib/addSources"

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
      const notice = await addSources({
        notebookId,
        sourceCount: sourceCount + uploadingCount,
        files,
        generateUploadUrl: async () => generateUploadUrl({}),
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
