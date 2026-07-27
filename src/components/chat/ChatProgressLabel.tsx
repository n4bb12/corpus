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
      initial={skipEntrance ? false : { height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      transition={fadeTransition}
      className="overflow-hidden"
    >
      <p className="shimmer text-sm font-medium text-primary" role="status">
        {label}
      </p>
    </motion.div>
  )
}
