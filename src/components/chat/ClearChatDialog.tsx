import { Button } from "src/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "src/components/ui/dialog"

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
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="rounded-2xl sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Clear chat</DialogTitle>
					<DialogDescription>
						This permanently removes all messages and citation snapshots for
						this notebook. Sources stay as they are.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						className="rounded-sm"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						className="rounded-sm"
						onClick={() => void onConfirm()}
					>
						Clear chat
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
