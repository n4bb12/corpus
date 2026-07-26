import { Plus } from "lucide-react"
import { motion } from "motion/react"
import { layoutTransition } from "src/lib/motion"

export type AddSourceCardProps = {
	onClick: () => void
}

export function AddSourceCard({ onClick }: AddSourceCardProps) {
	return (
		<motion.button
			type="button"
			layout
			transition={layoutTransition}
			className="mb-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-border/90 bg-card/40 px-3 py-3 text-left transition-colors hover:border-primary/45 hover:bg-muted/50"
			onClick={onClick}
		>
			<span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-dashed border-primary/35 bg-primary/10 text-primary">
				<Plus size={18} aria-hidden />
			</span>
			<span className="min-w-0">
				<span className="block text-sm font-medium text-foreground">
					Add source
				</span>
				<span className="mt-0.5 block text-xs text-muted-foreground">
					URL, file, or pasted text
				</span>
			</span>
		</motion.button>
	)
}
