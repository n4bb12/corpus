import { useState } from "react"
import { Button } from "src/components/ui/shadcn/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "src/components/ui/shadcn/dialog"
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
						This permanently removes the source from this notebook. Citations
						already shown in chat stay until you clear the chat or delete the
						notebook.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						className="rounded-full"
						disabled={pending}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						className="rounded-full"
						disabled={pending}
						onClick={() => void confirm()}
					>
						<PendingLabel pending={pending} pendingLabel="Deleting source">
							Delete source
						</PendingLabel>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
