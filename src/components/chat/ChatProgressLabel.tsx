import { motion } from "motion/react"
import { fadeTransition } from "src/lib/motion"

export type ChatProgressLabelProps = {
  label: string | null
  /** Skip the enter animation when handing off from an optimistic row. */
  skipEntrance?: boolean
}

export function ChatProgressLabel({
  label,
  skipEntrance = false,
}: ChatProgressLabelProps) {
  if (!label) {
    return null
  }

  return (
    <motion.div
      initial={
        skipEntrance
          ? false
          : {
              opacity: 0,
              gridTemplateRows: "0fr",
            }
      }
      animate={{
        opacity: 1,
        gridTemplateRows: "1fr",
      }}
      transition={fadeTransition}
      className="grid"
    >
      <div className="min-h-0 overflow-hidden">
        <p className="shimmer text-sm font-medium text-primary" role="status">
          {label}
        </p>
      </div>
    </motion.div>
  )
}
