import { useState } from "react"
import { Button } from "src/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "src/components/ui/dialog"
import { Input } from "src/components/ui/input"
import { PendingLabel } from "src/components/ui/PendingLabel"

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
	const [pending, setPending] = useState(false)

	async function save() {
		setPending(true)

		try {
			await onSave()
		} finally {
			setPending(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="rounded-2xl sm:max-w-md">
				<form
					className="grid gap-6"
					onSubmit={(event) => {
						event.preventDefault()

						if (pending) {
							return
						}

						void save()
					}}
				>
					<DialogHeader>
						<DialogTitle>Rename source</DialogTitle>
					</DialogHeader>
					<Input
						value={title}
						onChange={(event) => onTitleChange(event.target.value)}
						className="rounded-xl"
						autoFocus
						disabled={pending}
						onFocus={(event) => event.currentTarget.select()}
					/>
					<DialogFooter>
						<Button type="submit" className="rounded-full" disabled={pending}>
							<PendingLabel pending={pending} pendingLabel="Saving">
								Save
							</PendingLabel>
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
