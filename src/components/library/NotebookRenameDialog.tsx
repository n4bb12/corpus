import { Button } from "src/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "src/components/ui/dialog"
import { Input } from "src/components/ui/input"
import { displayNotebookTitle } from "src/lib/limits"

export type NotebookRenameDialogProps = {
	open: boolean
	draft: string
	onDraftChange: (value: string) => void
	onOpenChange: (open: boolean) => void
	onSave: () => Promise<void>
}

export function NotebookRenameDialog({
	open,
	draft,
	onDraftChange,
	onOpenChange,
	onSave,
}: NotebookRenameDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="rounded-2xl sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Rename notebook</DialogTitle>
					<DialogDescription>
						Use 1–100 characters. Another notebook can share the same title.
					</DialogDescription>
				</DialogHeader>
				<Input
					value={draft}
					onChange={(event) => onDraftChange(event.target.value)}
					className="rounded-xl"
					maxLength={100}
					placeholder={displayNotebookTitle("")}
					autoFocus
				/>
				<DialogFooter>
					<Button
						variant="outline"
						className="rounded-sm"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button className="rounded-sm" onClick={() => void onSave()}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
