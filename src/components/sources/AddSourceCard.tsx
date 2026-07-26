import { Plus } from "lucide-react"
import { cn } from "src/lib/utils"

export type AddSourceCardProps = {
	onClick: () => void
}

export function AddSourceCard({ onClick }: AddSourceCardProps) {
	return (
		<button
			type="button"
			className={cn(
				"group flex w-full items-center gap-3 rounded-2xl bg-card/70 px-3.5 py-3.5 text-left",
				"ring-1 ring-foreground/6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
				"hover:translate-y-[-1px] hover:bg-muted/50 hover:ring-primary/25",
			)}
			onClick={onClick}
		>
			<span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105">
				<Plus size={18} aria-hidden strokeWidth={1.5} />
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
