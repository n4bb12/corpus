import { Button } from "src/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "src/components/ui/dialog"

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
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="rounded-2xl sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Delete notebook</DialogTitle>
					<DialogDescription>
						Permanently delete “{label}”? Messages, citations, sources, and
						files will be removed. This cannot be undone.
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
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
