import { useQuery } from "convex/react"
import { useEffect, useRef, useState } from "react"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { addSources } from "src/lib/addSources"
import { quotaResetMessage } from "src/lib/quotas"
import { formatUserError } from "src/lib/userError"

export function useAddSourceDialogData({
  open,
  onOpenChange,
  notebookId,
  onFiles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  notebookId: Id<"notebooks">
  onFiles: (files: File[]) => Promise<void>
}) {
  const [mode, setMode] = useState<"main" | "text">("main")
  const [url, setUrl] = useState("")
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const urlRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const quota = useQuery(api.sources.getIngestionQuota, open ? {} : "skip")
  const quotaExhausted = quota?.exhausted === true
  const quotaMessage = quotaExhausted ? quotaResetMessage("ingestion") : null

  useEffect(() => {
    if (!open) {
      if (!pending) {
        setMode("main")
        setUrl("")
        setText("")
        setError(null)
      }

      return
    }

    const handle = window.setTimeout(() => {
      if (quotaExhausted) {
        return
      }

      if (mode === "main") {
        urlRef.current?.focus()
      } else {
        textRef.current?.focus()
      }
    }, 10)

    return () => window.clearTimeout(handle)
  }, [open, mode, pending, quotaExhausted])

  async function submitUrl() {
    if (quotaExhausted) {
      setError(quotaResetMessage("ingestion"))
      return
    }

    setPending(true)
    setError(null)
    const submittedUrl = url

    onOpenChange(false)

    try {
      await addSources({
        notebookId,
        sourceCount: 0,
        urls: [submittedUrl],
      })
    } catch (err) {
      setUrl(submittedUrl)
      setMode("main")
      setError(formatUserError(err, "Couldn't add this URL."))
      onOpenChange(true)
    } finally {
      setPending(false)
    }
  }

  async function submitText() {
    if (quotaExhausted) {
      setError(quotaResetMessage("ingestion"))
      return
    }

    setPending(true)
    setError(null)
    const submittedText = text

    onOpenChange(false)

    try {
      await addSources({
        notebookId,
        sourceCount: 0,
        texts: [submittedText],
      })
    } catch (err) {
      setText(submittedText)
      setMode("text")
      setError(formatUserError(err, "Couldn't add this text."))
      onOpenChange(true)
    } finally {
      setPending(false)
    }
  }

  async function submitFiles(files: File[]) {
    if (quotaExhausted) {
      setError(quotaResetMessage("ingestion"))
      return
    }

    onOpenChange(false)
    await onFiles(files)
  }

  return {
    mode,
    setMode,
    url,
    setUrl,
    text,
    setText,
    error,
    pending,
    quotaMessage,
    quotaExhausted,
    urlRef,
    textRef,
    fileRef,
    submitUrl,
    submitText,
    submitFiles,
  }
}
