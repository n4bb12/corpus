import { Button } from "src/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "src/components/ui/dialog"
import { Input } from "src/components/ui/input"

export type SourceRenameDialogProps = {
	open: boolean
	title: string
	onTitleChange: (value: string) => void
	onOpenChange: (open: boolean) => void
	onSave: () => Promise<void>
}

export function SourceRenameDialog({
	open,
	title,
	onTitleChange,
	onOpenChange,
	onSave,
}: SourceRenameDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="rounded-2xl sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Rename source</DialogTitle>
				</DialogHeader>
				<Input
					value={title}
					onChange={(event) => onTitleChange(event.target.value)}
					className="rounded-xl"
					autoFocus
					onFocus={(event) => event.currentTarget.select()}
				/>
				<DialogFooter>
					<Button className="rounded-sm" onClick={() => void onSave()}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
