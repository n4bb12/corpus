import { motion } from "motion/react"
import type { RefObject } from "react"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { Button } from "src/components/ui/shadcn/button"
import { Textarea } from "src/components/ui/shadcn/textarea"
import { layoutTransition } from "src/lib/motion"

export type AddSourceTextPanelProps = {
  text: string
  error: string | null
  pending: boolean
  disabled?: boolean
  quotaMessage?: string | null
  textRef: RefObject<HTMLTextAreaElement | null>
  onTextChange: (value: string) => void
  onBack: () => void
  onSubmit: () => Promise<void>
}

export function AddSourceTextPanel({
  text,
  error,
  pending,
  disabled = false,
  quotaMessage = null,
  textRef,
  onTextChange,
  onBack,
  onSubmit,
}: AddSourceTextPanelProps) {
  return (
    <motion.div
      key="text"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={layoutTransition}
      className="flex h-full min-h-0 flex-col gap-4"
    >
      {quotaMessage ? (
        <p className="shrink-0 text-sm text-destructive">{quotaMessage}</p>
      ) : null}

      <Textarea
        ref={textRef}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        className="min-h-0 flex-1 rounded-xl"
        placeholder="Paste the text you want to add as a source"
        disabled={disabled || pending}
      />

      {!quotaMessage && error ? (
        <p className="shrink-0 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="flex shrink-0 justify-between gap-2">
        <Button variant="outline" className="rounded-full" onClick={onBack}>
          Back
        </Button>

        <Button
          className="rounded-full"
          disabled={disabled || pending || !text.trim()}
          onClick={() => void onSubmit()}
        >
          <PendingLabel pending={pending} pendingLabel="Adding source">
            Add source
          </PendingLabel>
        </Button>
      </div>
    </motion.div>
  )
}
