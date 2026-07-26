import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"
import {
	pageEnterInitial,
	respectReducedMotion,
	revealTransition,
} from "src/lib/motion"
import { cn } from "src/lib/utils"

export type RevealProps = {
	children: ReactNode
	className?: string
	delay?: number
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
	const reduceMotion = useReducedMotion()

	return (
		<motion.div
			className={cn(className)}
			initial={pageEnterInitial}
			whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
			viewport={{ once: true, margin: "-32px" }}
			transition={respectReducedMotion(reduceMotion, {
				...revealTransition,
				delay,
			})}
		>
			{children}
		</motion.div>
	)
}
