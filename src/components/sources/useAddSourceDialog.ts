import { useEffect, useRef, useState } from "react"
import type { Id } from "src/convex/_generated/dataModel"
import { startSourceIngest } from "src/lib/ingest-client"

export function useAddSourceDialog({
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
			if (mode === "main") {
				urlRef.current?.focus()
			} else {
				textRef.current?.focus()
			}
		}, 10)

		return () => window.clearTimeout(handle)
	}, [open, mode, pending])

	async function submitUrl() {
		setPending(true)
		setError(null)
		const submittedUrl = url

		onOpenChange(false)

		try {
			await startSourceIngest({
				action: "create",
				kind: "url",
				notebookId,
				url: submittedUrl,
			})
		} catch (err) {
			setUrl(submittedUrl)
			setMode("main")
			setError(err instanceof Error ? err.message : "Could not add URL.")
			onOpenChange(true)
		} finally {
			setPending(false)
		}
	}

	async function submitText() {
		setPending(true)
		setError(null)
		const submittedText = text

		onOpenChange(false)

		try {
			await startSourceIngest({
				action: "create",
				kind: "text",
				notebookId,
				text: submittedText,
			})
		} catch (err) {
			setText(submittedText)
			setMode("text")
			setError(err instanceof Error ? err.message : "Could not add text.")
			onOpenChange(true)
		} finally {
			setPending(false)
		}
	}

	async function submitFiles(files: File[]) {
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
		urlRef,
		textRef,
		fileRef,
		submitUrl,
		submitText,
		submitFiles,
	}
}
