import { motion, useReducedMotion } from "motion/react"
import { type ReactNode, useState } from "react"
import { respectReducedMotion, revealTransition } from "src/lib/motion"
import { cn } from "src/lib/utils"

export type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
}

const revealHidden = { opacity: 0, y: 12 }
const revealVisible = { opacity: 1, y: 0 }

// Pine shadow (~56px blur) + enter travel (12px) / page-slide travel (28px).
// Keep in sync with `--shadow-pine`, `revealHidden.y`, and library page slides.
const REVEAL_OVERFLOW_GUTTER = "-m-24 p-24"

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduceMotion = useReducedMotion()
  // Full clip only while the enter translate is active so it cannot grow the
  // scrollport. Afterward keep horizontal clip at the gutter edge so page
  // slides cannot hard-cut pine shadows against the scrollport.
  const [clipOverflow, setClipOverflow] = useState(true)

  return (
    <div
      className={cn(
        "pointer-events-none",
        REVEAL_OVERFLOW_GUTTER,
        clipOverflow ? "overflow-clip" : "overflow-x-clip",
      )}
    >
      <motion.div
        className={cn("pointer-events-auto", className)}
        initial={revealHidden}
        animate={revealVisible}
        transition={respectReducedMotion(reduceMotion, {
          ...revealTransition,
          delay,
        })}
        onAnimationComplete={() => setClipOverflow(false)}
      >
        {children}
      </motion.div>
    </div>
  )
}
