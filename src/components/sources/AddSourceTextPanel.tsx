import { motion } from "motion/react"
import type { RefObject } from "react"
import { Button } from "src/components/ui/shadcn/button"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { Textarea } from "src/components/ui/shadcn/textarea"
import { layoutTransition } from "src/lib/motion"

export type AddSourceTextPanelProps = {
	text: string
	error: string | null
	pending: boolean
	textRef: RefObject<HTMLTextAreaElement | null>
	onTextChange: (value: string) => void
	onBack: () => void
	onSubmit: () => Promise<void>
}

export function AddSourceTextPanel({
	text,
	error,
	pending,
	textRef,
	onTextChange,
	onBack,
	onSubmit,
}: AddSourceTextPanelProps) {
	return (
		<motion.div
			key="text"
			initial={{ opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -4 }}
			transition={layoutTransition}
			className="flex h-full min-h-0 flex-col gap-4"
		>
			<Textarea
				ref={textRef}
				value={text}
				onChange={(event) => onTextChange(event.target.value)}
				className="min-h-0 flex-1 rounded-xl"
				placeholder="Paste the text you want to add as a source"
			/>
			{error ? (
				<p className="shrink-0 text-sm text-destructive">{error}</p>
			) : null}
			<div className="flex shrink-0 justify-between gap-2">
				<Button variant="outline" className="rounded-full" onClick={onBack}>
					Back
				</Button>
				<Button
					className="rounded-full"
					disabled={pending || !text.trim()}
					onClick={() => void onSubmit()}
				>
					<PendingLabel pending={pending} pendingLabel="Adding source">
						Add source
					</PendingLabel>
				</Button>
			</div>
		</motion.div>
	)
}
