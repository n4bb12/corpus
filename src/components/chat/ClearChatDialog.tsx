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

export type ClearChatDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => Promise<void>
}

export function ClearChatDialog({
	open,
	onOpenChange,
	onConfirm,
}: ClearChatDialogProps) {
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
					<DialogTitle>Clear chat</DialogTitle>
					<DialogDescription>
						This permanently deletes every message in this notebook. Your
						sources are not affected.
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
						<PendingLabel pending={pending} pendingLabel="Clearing chat">
							Clear chat
						</PendingLabel>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
