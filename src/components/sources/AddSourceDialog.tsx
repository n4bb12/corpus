import { UploadSimple } from "@phosphor-icons/react"
import { useMutation } from "convex/react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { Button } from "#/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog"
import { Input } from "#/components/ui/input"
import { Textarea } from "#/components/ui/textarea"
import { layoutTransition } from "#/lib/motion"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[32rem] overflow-hidden rounded-2xl">
				<DialogHeader>
					<DialogTitle>Add source</DialogTitle>
				</DialogHeader>
				<AnimatePresence mode="wait" initial={false}>
					{mode === "main" ? (
						<motion.div
							key="main"
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -4 }}
							transition={layoutTransition}
							layout
							className="space-y-4"
						>
							<form
								className="flex gap-2"
								onSubmit={async (event) => {
									event.preventDefault()
									setPending(true)
									setError(null)

									try {
										await addUrl({ notebookId, url })
										onOpenChange(false)
									} catch (err) {
										setError(
											err instanceof Error ? err.message : "Could not add URL.",
										)
									} finally {
										setPending(false)
									}
								}}
							>
								<Input
									ref={urlRef}
									value={url}
									onChange={(event) => setUrl(event.target.value)}
									placeholder="https://example.com/article"
									className="rounded-xl"
								/>
								<Button
									type="submit"
									className="rounded-[10px]"
									disabled={pending}
								>
									Add
								</Button>
							</form>

							<div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
								<div className="h-px flex-1 bg-border" />
								or
								<div className="h-px flex-1 bg-border" />
							</div>

							<button
								type="button"
								className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5"
								onClick={() => fileRef.current?.click()}
								onDragOver={(event) => event.preventDefault()}
								onDrop={async (event) => {
									event.preventDefault()
									const files = [...event.dataTransfer.files]
									if (!files.length) {
										return
									}

									await onFiles(files)
									onOpenChange(false)
								}}
							>
								<UploadSimple size={22} />
								Drop files here or browse
							</button>
							<input
								ref={fileRef}
								type="file"
								multiple
								className="hidden"
								onChange={async (event) => {
									const files = [...(event.target.files ?? [])]
									if (!files.length) {
										return
									}

									await onFiles(files)
									onOpenChange(false)
								}}
							/>

							<Button
								type="button"
								variant="ghost"
								className="w-full rounded-[10px]"
								onClick={() => setMode("text")}
							>
								Add pasted text
							</Button>
							{error ? (
								<motion.p
									layout
									className="text-sm text-destructive"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
								>
									{error}
								</motion.p>
							) : null}
						</motion.div>
					) : (
						<motion.div
							key="text"
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -4 }}
							transition={layoutTransition}
							layout
							className="space-y-4"
						>
							<Textarea
								ref={textRef}
								value={text}
								onChange={(event) => setText(event.target.value)}
								className="min-h-40 rounded-xl"
								placeholder="Paste source text"
							/>
							{error ? (
								<p className="text-sm text-destructive">{error}</p>
							) : null}
							<div className="flex justify-between gap-2">
								<Button
									variant="outline"
									className="rounded-[10px]"
									onClick={() => setMode("main")}
								>
									Back
								</Button>
								<Button
									className="rounded-[10px]"
									disabled={pending}
									onClick={async () => {
										setPending(true)
										setError(null)

										try {
											await addText({ notebookId, text })
											onOpenChange(false)
										} catch (err) {
											setError(
												err instanceof Error
													? err.message
													: "Could not add text.",
											)
										} finally {
											setPending(false)
										}
									}}
								>
									Add text
								</Button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</DialogContent>
		</Dialog>
	)
}
