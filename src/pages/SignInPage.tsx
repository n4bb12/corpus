import { motion, useReducedMotion } from "motion/react"
import { AuthShell } from "src/components/auth/AuthShell"
import { SignInCard } from "src/components/auth/SignInCard"
import { Bezel } from "src/components/ui/Bezel"
import {
  layoutTransition,
  pageEnterAnimate,
  pageEnterInitial,
  respectReducedMotion,
} from "src/lib/motion"

export function SignInPage() {
  const reduceMotion = useReducedMotion()

  return (
    <AuthShell>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-20">
        <motion.div
          className="space-y-6 text-center lg:text-left"
          initial={pageEnterInitial}
          animate={pageEnterAnimate}
          transition={respectReducedMotion(reduceMotion, layoutTransition)}
        >
          <h1 className="font-heading text-4xl leading-[1.02] font-semibold tracking-tight text-balance md:text-6xl lg:text-7xl">
            Turn your sources into answers you can trust.
          </h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg lg:mx-0">
            Gather your sources, ask precise questions, and follow every claim
            back to the passage that supports it.
          </p>
        </motion.div>

        <motion.div
          className="mx-auto w-full max-w-88 sm:max-w-104 md:max-w-120 lg:mx-0 lg:max-w-none"
          initial={pageEnterInitial}
          animate={pageEnterAnimate}
          transition={respectReducedMotion(reduceMotion, {
            ...layoutTransition,
            delay: 0.1,
          })}
        >
          <Bezel
            className="shadow-(--shadow-pine)"
            innerClassName="bg-card p-6 sm:p-8 md:aspect-2/3 md:p-10 lg:p-12"
          >
            <SignInCard />
          </Bezel>
        </motion.div>
      </div>
    </AuthShell>
  )
}
