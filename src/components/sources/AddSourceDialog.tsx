import { useMutation } from "convex/react"
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
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"

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
	const addUrl = useMutation(api.sources.addUrl)
	const addText = useMutation(api.sources.addText)
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
			setMode("main")
			setUrl("")
			setText("")
			setError(null)
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
	}, [open, mode])

	async function submitUrl() {
		setPending(true)
		setError(null)

		try {
			await addUrl({ notebookId, url })
			onOpenChange(false)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not add URL.")
		} finally {
			setPending(false)
		}
	}

	async function submitText() {
		setPending(true)
		setError(null)

		try {
			await addText({ notebookId, text })
			onOpenChange(false)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not add text.")
		} finally {
			setPending(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[32rem] overflow-hidden rounded-2xl">
				<DialogHeader>
					<DialogTitle>Add source</DialogTitle>
				</DialogHeader>
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
							onFiles={onFiles}
							onDone={() => onOpenChange(false)}
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
			</DialogContent>
		</Dialog>
	)
}
