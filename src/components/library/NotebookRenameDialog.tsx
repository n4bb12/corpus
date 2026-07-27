import { useState } from "react"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { Button } from "src/components/ui/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/shadcn/dialog"
import { Input } from "src/components/ui/shadcn/input"
import { displayNotebookTitle } from "src/lib/limits"

export type NotebookRenameDialogProps = {
  open: boolean
  draft: string
  onDraftChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onSave: () => Promise<void>
}

export function NotebookRenameDialog({
  open,
  draft,
  onDraftChange,
  onOpenChange,
  onSave,
}: NotebookRenameDialogProps) {
  const [pending, setPending] = useState(false)

  async function save() {
    setPending(true)

    try {
      await onSave()
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <form
          className="grid gap-6"
          onSubmit={(event) => {
            event.preventDefault()

            if (pending) {
              return
            }

            void save()
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename notebook</DialogTitle>
            <DialogDescription>
              Use 1–100 characters. Another notebook can share the same title.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            className="rounded-xl"
            maxLength={100}
            placeholder={displayNotebookTitle("")}
            autoFocus
            disabled={pending}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={pending}>
              <PendingLabel pending={pending} pendingLabel="Saving">
                Save
              </PendingLabel>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
