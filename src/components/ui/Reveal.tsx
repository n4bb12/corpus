import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"
import { revealTransition } from "src/lib/motion"
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
			initial={
				reduceMotion ? false : { opacity: 0, y: 12, filter: "blur(4px)" }
			}
			whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
			viewport={{ once: true, margin: "-32px" }}
			transition={{ ...revealTransition, delay: reduceMotion ? 0 : delay }}
		>
			{children}
		</motion.div>
	)
}
