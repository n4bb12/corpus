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

export type NotebookDeleteDialogProps = {
	open: boolean
	label: string
	onOpenChange: (open: boolean) => void
	onConfirm: () => Promise<void>
}

export function NotebookDeleteDialog({
	open,
	label,
	onOpenChange,
	onConfirm,
}: NotebookDeleteDialogProps) {
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
					<DialogTitle>Delete notebook</DialogTitle>
					<DialogDescription>
						Permanently delete “{label}”? All sources, files, messages, and
						citations in it will be removed. This cannot be undone.
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
						<PendingLabel pending={pending} pendingLabel="Deleting notebook">
							Delete notebook
						</PendingLabel>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
