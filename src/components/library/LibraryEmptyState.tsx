import { BookOpen } from "lucide-react"
import { Bezel } from "src/components/ui/Bezel"
import { IslandCta } from "src/components/ui/IslandCta"
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
		<Bezel className="shadow-(--shadow-pine)" innerClassName="p-8 md:p-12">
			<div className="flex flex-col items-start gap-6">
				<span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
					<BookOpen size={28} strokeWidth={1.5} />
				</span>
				<div className="space-y-3">
					<h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
						Create your first notebook
					</h2>
					<p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
						Add sources, ask questions grounded in them, and open citations next
						to every answer.
					</p>
				</div>
				<IslandCta disabled={creating} onClick={onCreate}>
					<PendingLabel pending={creating} pendingLabel="Creating notebook">
						New notebook
					</PendingLabel>
				</IslandCta>
			</div>
		</Bezel>
	)
}
