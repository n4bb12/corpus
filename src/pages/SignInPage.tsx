import { motion, useReducedMotion } from "motion/react"
import { AuthShell } from "src/components/auth/AuthShell"
import { SignInCard } from "src/components/auth/SignInCard"
import { layoutTransition } from "src/lib/motion"

export function SignInPage() {
	const reduceMotion = useReducedMotion()

	return (
		<AuthShell>
			<div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
				<motion.div
					className="space-y-4 text-center lg:text-left"
					initial={reduceMotion ? false : { opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={layoutTransition}
				>
					<p className="font-heading text-sm tracking-[0.18em] text-primary uppercase">
						Grounded research notebooks
					</p>
					<h1 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
						Turn your sources into answers you can trust.
					</h1>
					<p className="mx-auto max-w-xl text-base text-muted-foreground md:text-lg lg:mx-0">
						Corpus is a calm place to collect reading, ask precise questions,
						and follow every claim back to the passage that supports it.
					</p>
				</motion.div>

				<motion.div
					className="mx-auto flex w-full max-w-[22rem] flex-col justify-center rounded-2xl border border-border bg-card p-5 shadow-(--shadow-pine) sm:max-w-[26rem] sm:p-6 md:max-w-[30rem] md:aspect-2/3 md:p-10 lg:mx-0 lg:max-w-none lg:p-12"
					initial={reduceMotion ? false : { opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...layoutTransition, delay: reduceMotion ? 0 : 0.08 }}
				>
					<SignInCard />
				</motion.div>
			</div>
		</AuthShell>
	)
}
