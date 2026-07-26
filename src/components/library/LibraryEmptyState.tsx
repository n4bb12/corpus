import { BookOpen, Plus } from "lucide-react"
import { Button } from "src/components/ui/button"
import { PendingLabel } from "src/components/ui/PendingLabel"

export type LibraryEmptyStateProps = {
	creating: boolean
	onCreate: () => void
}

export function LibraryEmptyState({
	creating,
	onCreate,
}: LibraryEmptyStateProps) {
	return (
		<div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-8 shadow-(--shadow-pine)">
			<span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
				<BookOpen size={28} />
			</span>
			<div className="space-y-2">
				<h2 className="text-xl font-semibold">Create your first notebook</h2>
				<p className="max-w-md text-sm text-muted-foreground">
					Add sources, ask grounded questions, and keep citations next to every
					answer.
				</p>
			</div>
			<Button className="rounded-sm" disabled={creating} onClick={onCreate}>
				<PendingLabel pending={creating} pendingLabel="Creating notebook">
					<span className="inline-flex items-center">
						<Plus size={16} className="mr-1.5" />
						New notebook
					</span>
				</PendingLabel>
			</Button>
		</div>
	)
}
