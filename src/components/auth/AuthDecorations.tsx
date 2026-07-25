import { motion, useReducedMotion } from "motion/react"

function FloatingPage({
	className,
	delay = 0,
}: {
	className?: string
	delay?: number
}) {
	const reduceMotion = useReducedMotion()

	return (
		<motion.div
			aria-hidden
			className={className}
			initial={{ opacity: 0, y: 12 }}
			animate={
				reduceMotion
					? { opacity: 0.55, y: 0 }
					: {
							opacity: [0.4, 0.7, 0.4],
							y: [0, -10, 0],
							rotate: [-2, 2, -2],
						}
			}
			transition={
				reduceMotion
					? { duration: 0.4 }
					: {
							duration: 14,
							repeat: Number.POSITIVE_INFINITY,
							ease: "easeInOut",
							delay,
						}
			}
		>
			<svg viewBox="0 0 120 150" className="h-full w-full" fill="none">
				<rect
					x="8"
					y="8"
					width="104"
					height="134"
					rx="10"
					className="fill-card stroke-primary/25"
					strokeWidth="2"
				/>
				<path
					d="M28 36h64M28 54h52M28 72h58M28 90h40"
					className="stroke-primary/35"
					strokeWidth="4"
					strokeLinecap="round"
				/>
				<path
					d="M28 112h28"
					className="stroke-primary/55"
					strokeWidth="4"
					strokeLinecap="round"
				/>
			</svg>
		</motion.div>
	)
}

function CitationOrb({
	className,
	delay = 0,
}: {
	className?: string
	delay?: number
}) {
	const reduceMotion = useReducedMotion()

	return (
		<motion.div
			aria-hidden
			className={className}
			initial={{ opacity: 0, scale: 0.92 }}
			animate={
				reduceMotion
					? { opacity: 0.6, scale: 1 }
					: {
							opacity: [0.45, 0.8, 0.45],
							scale: [1, 1.04, 1],
							y: [0, -8, 0],
						}
			}
			transition={
				reduceMotion
					? { duration: 0.4 }
					: {
							duration: 11,
							repeat: Number.POSITIVE_INFINITY,
							ease: "easeInOut",
							delay,
						}
			}
		>
			<svg viewBox="0 0 96 96" className="h-full w-full" fill="none">
				<circle
					cx="48"
					cy="48"
					r="40"
					className="fill-primary/10 stroke-primary/30"
					strokeWidth="2"
				/>
				<path
					d="M34 40c0-8 6-14 14-14s14 6 14 14c0 10-14 18-14 18S34 50 34 40Z"
					className="fill-primary/25"
				/>
				<circle cx="48" cy="68" r="4" className="fill-primary/55" />
			</svg>
		</motion.div>
	)
}

function LinkTrail({ className }: { className?: string }) {
	const reduceMotion = useReducedMotion()

	return (
		<motion.svg
			aria-hidden
			viewBox="0 0 280 120"
			className={className}
			fill="none"
			initial={{ opacity: 0 }}
			animate={
				reduceMotion ? { opacity: 0.35 } : { opacity: [0.18, 0.42, 0.18] }
			}
			transition={
				reduceMotion
					? { duration: 0.4 }
					: {
							duration: 16,
							repeat: Number.POSITIVE_INFINITY,
							ease: "easeInOut",
						}
			}
		>
			<path
				d="M12 88C48 28 96 24 140 52c36 24 72 40 128 8"
				className="stroke-primary/30"
				strokeWidth="2"
				strokeLinecap="round"
				strokeDasharray="6 10"
			/>
			<circle cx="12" cy="88" r="4" className="fill-primary/40" />
			<circle cx="140" cy="52" r="4" className="fill-primary/50" />
			<circle cx="268" cy="60" r="4" className="fill-primary/40" />
		</motion.svg>
	)
}

export function AuthDecorations() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
		>
			<div className="absolute -top-24 -left-16 size-[28rem] rounded-full bg-primary/8 blur-3xl" />
			<div className="absolute top-1/3 -right-20 size-[24rem] rounded-full bg-primary/10 blur-3xl" />
			<div className="absolute -bottom-28 left-1/4 size-[22rem] rounded-full bg-primary/6 blur-3xl" />

			<FloatingPage className="absolute top-[18%] left-[6%] hidden h-36 w-28 md:block lg:left-[10%]" />
			<FloatingPage
				className="absolute right-[8%] bottom-[16%] hidden h-40 w-32 md:block lg:right-[12%]"
				delay={2.5}
			/>
			<CitationOrb
				className="absolute top-[22%] right-[14%] hidden size-24 md:block"
				delay={1.2}
			/>
			<CitationOrb
				className="absolute bottom-[28%] left-[12%] hidden size-20 lg:block"
				delay={3.4}
			/>
			<LinkTrail className="absolute top-[42%] left-[18%] hidden h-28 w-72 xl:block" />
		</div>
	)
}
