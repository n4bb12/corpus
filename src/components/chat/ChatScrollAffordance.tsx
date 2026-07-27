import { ArrowDown } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "src/components/ui/shadcn/button"
import { fadeTransition } from "src/lib/motion"

export type ChatScrollAffordanceProps = {
  visible: boolean
  onScrollToBottom: () => void
}

export function ChatScrollAffordance({
  visible,
  onScrollToBottom,
}: ChatScrollAffordanceProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="chat-scroll-affordance"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fadeTransition}
          className="pointer-events-none absolute inset-x-0 bottom-full"
        >
          <div
            aria-hidden
            className="h-28 bg-linear-to-t from-background from-15% via-background/80 to-transparent"
          />
          <div className="pointer-events-auto absolute inset-x-0 bottom-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full bg-card shadow-(--shadow-pine)"
              aria-label="Scroll to bottom"
              onClick={onScrollToBottom}
            >
              <ArrowDown />
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
