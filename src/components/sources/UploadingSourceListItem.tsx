import { LoaderCircle } from "lucide-react"
import { Checkbox } from "src/components/ui/shadcn/checkbox"
import { formatTitle } from "src/lib/source_title"
import type { UploadingSource } from "src/lib/uploading_sources"

export type UploadingSourceListItemProps = {
  source: UploadingSource
}

export function UploadingSourceListItem({
  source,
}: UploadingSourceListItemProps) {
  const label = formatTitle(source.title)
  const checkboxId = `source-upload-${source.localId}`

  return (
    <div className="group relative flex items-start gap-2 rounded-2xl px-2.5 py-2.5">
      <span className="mt-0.5 text-primary">
        <LoaderCircle size={18} className="animate-spin" strokeWidth={1.5} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-medium">{label}</span>

        <span className="mt-0.5 block text-xs text-muted-foreground">
          Uploading
        </span>
      </span>

      <div className="flex items-center gap-1">
        <span className="size-6 shrink-0" aria-hidden />

        <Checkbox
          id={checkboxId}
          checked
          className="pointer-events-none"
          tabIndex={-1}
          aria-label={`Selected ${label}`}
        />
      </div>
    </div>
  )
}
