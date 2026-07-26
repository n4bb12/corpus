import { motion, useReducedMotion } from "motion/react"
import { AuthShell } from "src/components/auth/AuthShell"
import { SignInCard } from "src/components/auth/SignInCard"
import { Bezel } from "src/components/ui/Bezel"
import { Eyebrow } from "src/components/ui/Eyebrow"
import { layoutTransition } from "src/lib/motion"

export function SignInPage() {
	const reduceMotion = useReducedMotion()

	return (
		<AuthShell>
			<div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-20">
				<motion.div
					className="space-y-6 text-center lg:text-left"
					initial={
						reduceMotion ? false : { opacity: 0, y: 20, filter: "blur(6px)" }
					}
					animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
					transition={layoutTransition}
				>
					<Eyebrow>Grounded research</Eyebrow>
					<h1 className="font-heading text-4xl leading-[1.02] font-semibold tracking-tight text-balance md:text-6xl lg:text-7xl">
						Turn your sources into answers you can trust.
					</h1>
					<p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg lg:mx-0">
						Corpus is a calm place to collect reading, ask precise questions,
						and follow every claim back to the passage that supports it.
					</p>
				</motion.div>

				<motion.div
					className="mx-auto w-full max-w-[22rem] sm:max-w-[26rem] md:max-w-[30rem] lg:mx-0 lg:max-w-none"
					initial={
						reduceMotion ? false : { opacity: 0, y: 24, filter: "blur(6px)" }
					}
					animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
					transition={{ ...layoutTransition, delay: reduceMotion ? 0 : 0.1 }}
				>
					<Bezel
						className="shadow-(--shadow-pine)"
						innerClassName="p-6 sm:p-8 md:aspect-2/3 md:p-10 lg:p-12"
					>
						<SignInCard />
					</Bezel>
				</motion.div>
			</div>
		</AuthShell>
	)
}
