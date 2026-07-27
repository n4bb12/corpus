import { motion } from "motion/react"
import type { RefObject } from "react"
import { AddSourceFileDropzone } from "src/components/sources/AddSourceFileDropzone"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { Button } from "src/components/ui/shadcn/button"
import { Input } from "src/components/ui/shadcn/input"
import { layoutTransition } from "src/lib/motion"

export type AddSourceMainPanelProps = {
  url: string
  error: string | null
  pending: boolean
  disabled?: boolean
  quotaMessage?: string | null
  urlRef: RefObject<HTMLInputElement | null>
  fileRef: RefObject<HTMLInputElement | null>
  onUrlChange: (value: string) => void
  onSubmitUrl: () => Promise<void>
  onFiles: (files: File[]) => Promise<void>
  onPasteText: () => void
}

function OrSeparator() {
  return (
    <div className="flex shrink-0 items-center gap-3 text-xs tracking-[0.18em] text-muted-foreground uppercase">
      <div className="h-px flex-1 bg-border" />
      or
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

export function AddSourceMainPanel({
  url,
  error,
  pending,
  disabled = false,
  quotaMessage = null,
  urlRef,
  fileRef,
  onUrlChange,
  onSubmitUrl,
  onFiles,
  onPasteText,
}: AddSourceMainPanelProps) {
  return (
    <motion.div
      key="main"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={layoutTransition}
      className="flex h-full min-h-0 flex-col gap-4"
    >
      {quotaMessage ? (
        <motion.p
          className="shrink-0 text-sm text-destructive"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {quotaMessage}
        </motion.p>
      ) : null}

      <form
        className="flex shrink-0 gap-2"
        onSubmit={async (event) => {
          event.preventDefault()
          await onSubmitUrl()
        }}
      >
        <Input
          ref={urlRef}
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://example.com/article"
          className="rounded-xl"
          disabled={disabled || pending}
        />

        <Button
          type="submit"
          className="rounded-full"
          disabled={disabled || pending || !url.trim()}
        >
          <PendingLabel pending={pending} pendingLabel="Adding source">
            Add
          </PendingLabel>
        </Button>
      </form>

      <OrSeparator />

      <AddSourceFileDropzone
        fileRef={fileRef}
        disabled={disabled || pending}
        onFiles={onFiles}
      />

      <OrSeparator />

      <Button
        type="button"
        variant="ghost"
        className="w-full shrink-0 rounded-full"
        disabled={disabled || pending}
        onClick={onPasteText}
      >
        Paste text
      </Button>

      {!quotaMessage && error ? (
        <motion.p
          className="shrink-0 text-sm text-destructive"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
        </motion.p>
      ) : null}
    </motion.div>
  )
}
