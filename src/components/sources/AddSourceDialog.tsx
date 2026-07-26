import { AnimatePresence } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { AddSourceMainPanel } from "src/components/sources/AddSourceMainPanel"
import { AddSourceTextPanel } from "src/components/sources/AddSourceTextPanel"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "src/components/ui/dialog"
import type { Id } from "src/convex/_generated/dataModel"
import { startSourceIngest } from "src/lib/ingest-client"

export type AddSourceDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	notebookId: Id<"notebooks">
	onFiles: (files: File[]) => Promise<void>
}

export function AddSourceDialog({
	open,
	onOpenChange,
	notebookId,
	onFiles,
}: AddSourceDialogProps) {
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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex aspect-3/2 w-full max-w-[min(48rem,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl sm:max-w-3xl">
				<DialogHeader className="shrink-0">
					<DialogTitle>Add source</DialogTitle>
				</DialogHeader>
				<div className="min-h-0 flex-1">
					<AnimatePresence mode="wait" initial={false}>
						{mode === "main" ? (
							<AddSourceMainPanel
								url={url}
								error={error}
								pending={pending}
								urlRef={urlRef}
								fileRef={fileRef}
								onUrlChange={setUrl}
								onSubmitUrl={submitUrl}
								onFiles={submitFiles}
								onPasteText={() => setMode("text")}
							/>
						) : (
							<AddSourceTextPanel
								text={text}
								error={error}
								pending={pending}
								textRef={textRef}
								onTextChange={setText}
								onBack={() => setMode("main")}
								onSubmit={submitText}
							/>
						)}
					</AnimatePresence>
				</div>
			</DialogContent>
		</Dialog>
	)
}
