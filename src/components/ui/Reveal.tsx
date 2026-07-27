import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"
import { respectReducedMotion, revealTransition } from "src/lib/motion"
import { cn } from "src/lib/utils"

export type RevealProps = {
	children: ReactNode
	className?: string
	delay?: number
}

const revealHidden = { opacity: 0, y: 12, filter: "blur(4px)" }
const revealVisible = { opacity: 1, y: 0, filter: "blur(0px)" }

export function Reveal({ children, className, delay = 0 }: RevealProps) {
	const reduceMotion = useReducedMotion()

	return (
		<motion.div
			className={cn(className)}
			initial={revealHidden}
			animate={revealVisible}
			transition={respectReducedMotion(reduceMotion, {
				...revealTransition,
				delay,
			})}
		>
			{children}
		</motion.div>
	)
}
