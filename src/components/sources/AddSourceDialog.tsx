import { AnimatePresence } from "motion/react"
import { AddSourceMainPanel } from "src/components/sources/AddSourceMainPanel"
import { AddSourceTextPanel } from "src/components/sources/AddSourceTextPanel"
import { useAddSourceDialog } from "src/components/sources/useAddSourceDialog"
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
  const dialog = useAddSourceDialog({
    open,
    onOpenChange,
    notebookId,
    onFiles,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex aspect-3/2 w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl sm:max-w-3xl">
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
