import { useState } from "react"
import { Button } from "src/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "src/components/ui/dialog"
import { PendingLabel } from "src/components/ui/PendingLabel"

export type SourceDeleteDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => Promise<void>
}

export function SourceDeleteDialog({
	open,
	onOpenChange,
	onConfirm,
}: SourceDeleteDialogProps) {
	const [pending, setPending] = useState(false)

	async function confirm() {
		setPending(true)

		try {
			await onConfirm()
		} finally {
			setPending(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="rounded-2xl sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Delete source</DialogTitle>
					<DialogDescription>
						This removes the upload, normalized content, chunks, and embeddings.
						Citation excerpts already saved in chat remain until chat or
						notebook deletion.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						className="rounded-sm"
						disabled={pending}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						className="rounded-sm"
						disabled={pending}
						onClick={() => void confirm()}
					>
						<PendingLabel pending={pending} pendingLabel="Deleting source">
							Delete
						</PendingLabel>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
