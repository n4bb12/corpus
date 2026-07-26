import { Layers } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { fadeTransition } from "src/lib/motion"

export type ChatSourceBoundaryProps = {
	activeSourceCount: number
}

export function ChatSourceBoundary({
	activeSourceCount,
}: ChatSourceBoundaryProps) {
	return (
		<>
			<div className="h-px min-w-4 flex-1 bg-border" />
			<p className="flex shrink-0 items-center gap-1.5 text-xs">
				<Layers size={12} aria-hidden />
				<span className="relative inline-grid">
					<AnimatePresence initial={false}>
						<motion.span
							key={activeSourceCount}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={fadeTransition}
							className="col-start-1 row-start-1"
						>
							Sources changed · {activeSourceCount} selected
						</motion.span>
					</AnimatePresence>
				</span>
			</p>
			<div className="h-px min-w-4 flex-1 bg-border" />
		</>
	)
}
