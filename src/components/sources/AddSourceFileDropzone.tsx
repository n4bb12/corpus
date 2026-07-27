import { Upload } from "lucide-react"
import type { RefObject } from "react"
import { cn } from "src/lib/utils"

export type AddSourceFileDropzoneProps = {
  fileRef: RefObject<HTMLInputElement | null>
  disabled?: boolean
  onFiles: (files: File[]) => Promise<void>
}

export function AddSourceFileDropzone({
  fileRef,
  disabled = false,
  onFiles,
}: AddSourceFileDropzoneProps) {
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-sm text-muted-foreground transition-colors duration-(--duration-hover) ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "hover:border-primary/40 hover:bg-primary/5",
        )}
        onClick={() => {
          if (disabled) {
            return
          }

          fileRef.current?.click()
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={async (event) => {
          event.preventDefault()

          if (disabled) {
            return
          }

          const files = [...event.dataTransfer.files]

          if (!files.length) {
            return
          }

          await onFiles(files)
        }}
      >
        <Upload size={22} />
        Drop files here or choose files
      </button>

      <input
        ref={fileRef}
        type="file"
        multiple
        disabled={disabled}
        className="hidden"
        onChange={async (event) => {
          const files = [...(event.target.files ?? [])]

          if (!files.length) {
            return
          }

          await onFiles(files)
          event.target.value = ""
        }}
      />
    </>
  )
}
