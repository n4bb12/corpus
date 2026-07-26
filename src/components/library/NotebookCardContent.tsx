import { Notebook } from "lucide-react"
import { cn } from "src/lib/utils"

export type NotebookCardContentProps = {
	label: string
	lastUsedLabel: string
	sourceCount: number
	loading: boolean
	featured?: boolean
}

export function NotebookCardContent({
	label,
	lastUsedLabel,
	sourceCount,
	loading,
	featured = false,
}: NotebookCardContentProps) {
	return (
		<>
			<div
				className={cn(
					"pointer-events-none relative z-10 flex shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10",
					featured ? "size-12" : "size-11",
					loading && "placeholder-shimmer",
				)}
				aria-hidden={loading}
			>
				<Notebook size={featured ? 24 : 22} strokeWidth={1.5} />
			</div>
			<div className="pointer-events-none relative z-10 mt-5 min-w-0 flex-1 max-sm:mt-0 max-sm:pr-10">
				<h2
					className={cn(
						"line-clamp-2 font-heading font-semibold tracking-tight",
						featured ? "text-xl md:text-2xl" : "text-base",
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
