import { AnimatePresence } from "motion/react"
import { AddSourceMainPanel } from "src/components/sources/AddSourceMainPanel"
import { AddSourceTextPanel } from "src/components/sources/AddSourceTextPanel"
import { useAddSourceDialogData } from "src/components/sources/useAddSourceDialogData"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/shadcn/dialog"
import type { Id } from "src/convex/_generated/dataModel"

export type AddSourceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  notebookId: Id<"notebooks">
  onFiles: (files: File[]) => Promise<void>
}

export function AddSourceDialog({
  open,
  onOpenChange,
  notebookId,
  onFiles,
}: AddSourceDialogProps) {
  const dialog = useAddSourceDialogData({
    open,
    onOpenChange,
    notebookId,
    onFiles,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl max-sm:min-h-[min(24rem,calc(100dvh-2rem))] sm:aspect-3/2 sm:max-w-3xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Add source</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {dialog.mode === "main" ? (
              <AddSourceMainPanel
                url={dialog.url}
                error={dialog.error}
                pending={dialog.pending}
                disabled={dialog.quotaExhausted}
                quotaMessage={dialog.quotaMessage}
                urlRef={dialog.urlRef}
                fileRef={dialog.fileRef}
                onUrlChange={dialog.setUrl}
                onSubmitUrl={dialog.submitUrl}
                onFiles={dialog.submitFiles}
                onPasteText={() => dialog.setMode("text")}
              />
            ) : (
              <AddSourceTextPanel
                text={dialog.text}
                error={dialog.error}
                pending={dialog.pending}
                disabled={dialog.quotaExhausted}
                quotaMessage={dialog.quotaMessage}
                textRef={dialog.textRef}
                onTextChange={dialog.setText}
                onBack={() => dialog.setMode("main")}
                onSubmit={dialog.submitText}
              />
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
