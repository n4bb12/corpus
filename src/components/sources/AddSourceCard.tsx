import { Plus } from "lucide-react"

export type AddSourceCardProps = {
	onClick: () => void
}

export function AddSourceCard({ onClick }: AddSourceCardProps) {
	return (
		<button
			type="button"
			className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-3 py-3 text-left transition-colors duration-(--duration-hover) ease-spring hover:border-primary/45 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary mb-4"
			onClick={onClick}
		>
			<span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
				<Plus size={18} aria-hidden />
			</span>
			<span className="min-w-0 leading-tight">
				<span className="block text-sm font-medium text-foreground">
					Add source
				</span>
				<span className="mt-1 block text-xs text-muted-foreground">
					URL, file, or pasted text
				</span>
			</span>
		</button>
	)
}
