import { Button } from "src/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "src/components/ui/dialog"

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
