import { Plus } from "lucide-react"
import { cn } from "src/lib/utils"

export type AddNotebookCardProps = {
	disabled?: boolean
	onClick: () => void
}

export function AddNotebookCard({ disabled, onClick }: AddNotebookCardProps) {
	return (
		<button
			type="button"
			disabled={disabled}
			className={cn(
				"flex min-h-[10.5rem] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-4 text-center transition-colors",
				"hover:border-primary/45 hover:bg-muted/50",
				"max-sm:min-h-0 max-sm:flex-row max-sm:justify-start max-sm:gap-3 max-sm:text-left",
				"disabled:pointer-events-none disabled:opacity-60",
			)}
			onClick={onClick}
		>
			<span className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
				<Plus size={22} aria-hidden />
			</span>
			<span className="min-w-0 leading-tight">
				<span className="block text-base font-semibold tracking-tight text-foreground">
					New notebook
				</span>
				<span className="mt-1 block text-sm text-muted-foreground">
					Start from sources
				</span>
			</span>
		</button>
	)
}
