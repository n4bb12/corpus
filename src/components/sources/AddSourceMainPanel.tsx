import { Upload } from "lucide-react"
import { motion } from "motion/react"
import type { RefObject } from "react"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { layoutTransition } from "src/lib/motion"

export type AddSourceMainPanelProps = {
	url: string
	error: string | null
	pending: boolean
	urlRef: RefObject<HTMLInputElement | null>
	fileRef: RefObject<HTMLInputElement | null>
	onUrlChange: (value: string) => void
	onSubmitUrl: () => Promise<void>
	onFiles: (files: File[]) => Promise<void>
	onDone: () => void
	onPasteText: () => void
}

export function AddSourceMainPanel({
	url,
	error,
	pending,
	urlRef,
	fileRef,
	onUrlChange,
	onSubmitUrl,
	onFiles,
	onDone,
	onPasteText,
}: AddSourceMainPanelProps) {
	return (
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
					await onSubmitUrl()
				}}
			>
				<Input
					ref={urlRef}
					value={url}
					onChange={(event) => onUrlChange(event.target.value)}
					placeholder="https://example.com/article"
					className="rounded-xl"
				/>
				<Button type="submit" className="rounded-sm" disabled={pending}>
					<PendingLabel pending={pending} pendingLabel="Adding source">
						Add
					</PendingLabel>
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
					onDone()
				}}
			>
				<Upload size={22} />
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
					onDone()
				}}
			/>

			<Button
				type="button"
				variant="ghost"
				className="w-full rounded-sm"
				onClick={onPasteText}
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
	)
}
