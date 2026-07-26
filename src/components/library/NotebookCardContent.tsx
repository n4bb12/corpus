import { Notebook } from "lucide-react"
import { cn } from "src/lib/utils"

export type NotebookCardContentProps = {
	label: string
	lastUsedLabel: string
	sourceCount: number
	loading: boolean
}

export function NotebookCardContent({
	label,
	lastUsedLabel,
	sourceCount,
	loading,
}: NotebookCardContentProps) {
	return (
		<>
			<div
				className={cn(
					"pointer-events-none relative z-10 flex size-11 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary",
					loading && "placeholder-shimmer",
				)}
				aria-hidden={loading}
			>
				<Notebook size={22} />
			</div>
			<div className="pointer-events-none relative z-10 mt-4 min-w-0 flex-1 max-sm:mt-0 max-sm:pr-10">
				<h2
					className={cn(
						"line-clamp-2 text-base font-semibold tracking-tight",
						loading && "placeholder-shimmer",
					)}
					aria-hidden={loading}
				>
					{label}
				</h2>
				<p
					className={cn(
						"mt-2 text-sm text-muted-foreground tabular-nums",
						loading && "placeholder-shimmer",
					)}
					aria-hidden={loading}
				>
					{lastUsedLabel}
				</p>
				<p
					className={cn(
						"mt-1 text-sm text-muted-foreground tabular-nums",
						loading && "placeholder-shimmer",
					)}
					aria-hidden={loading}
				>
					{sourceCount} sources
				</p>
			</div>
		</>
	)
}
