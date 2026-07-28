import { CircleAlert, FileText, Link as LinkIcon, Type } from "lucide-react"
import { memo } from "react"
import { SourceListItemMenu } from "src/components/sources/SourceListItemMenu"
import { Checkbox } from "src/components/ui/shadcn/checkbox"
import { Label } from "src/components/ui/shadcn/label"
import { Spinner } from "src/components/ui/shadcn/spinner"
import type { Doc, Id } from "src/convex/_generated/dataModel"
import { formatTitle } from "src/lib/sourceTitle"
import {
  pendingSourceStatus,
  type SourcesListEntry,
} from "src/lib/uploadingSources"
import { cn } from "src/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  pending: "Starting",
  extracting: "Reading",
  chunking: "Preparing",
  embedding: "Indexing",
  summarizing: "Summarizing",
  ready: "Ready",
  failed: "Couldn't process",
}

export type SourceListItemProps = {
  entry: SourcesListEntry
  onPreview: (sourceId: Id<"sources">) => void
  onRename: (source: Doc<"sources">) => void
  onRetry: (sourceId: Id<"sources">) => void
  onDelete: (sourceId: Id<"sources">) => void
  onSelect: (sourceId: Id<"sources">, selected: boolean) => void
}

export const SourceListItem = memo(function SourceListItem({
  entry,
  onPreview,
  onRename,
  onRetry,
  onDelete,
  onSelect,
}: SourceListItemProps) {
  const source = entry.type === "source" ? entry.source : null
  const uploading = entry.type === "uploading" ? entry.source : null
  const kind = source?.kind ?? uploading?.kind ?? "file"
  const Icon = kind === "url" ? LinkIcon : kind === "file" ? FileText : Type
  const failed = source?.processingState === "failed"
  const busy =
    !!uploading ||
    (!!source &&
      source.processingState !== "ready" &&
      source.processingState !== "failed")
  const label = formatTitle((source ?? uploading)?.title ?? "")
  const statusText = uploading
    ? pendingSourceStatus(uploading)
    : failed
      ? source?.errorCode || STATUS_LABEL.failed
      : source
        ? STATUS_LABEL[source.processingState]
        : undefined
  const checkboxId = uploading
    ? `source-upload-${uploading.localId}`
    : source
      ? `source-select-${source._id}`
      : "source-select"

  const trailing = source ? (
    <>
      <SourceListItemMenu
        label={label}
        source={source}
        failed={!!failed}
        onRename={onRename}
        onRetry={onRetry}
        onDelete={onDelete}
      />

      <Label
        htmlFor={checkboxId}
        className="flex cursor-pointer items-center gap-2"
      >
        <span className="sr-only">Select {label}</span>

        <Checkbox
          id={checkboxId}
          checked={source.selected}
          disabled={!!failed}
          onCheckedChange={(checked) => onSelect(source._id, checked === true)}
        />
      </Label>
    </>
  ) : (
    <>
      <span className="size-6 shrink-0" aria-hidden />

      <Checkbox
        id={checkboxId}
        checked
        className="pointer-events-none"
        tabIndex={-1}
        aria-label={`Selected ${label}`}
      />
    </>
  )

  return (
    <div
      className={cn(
        "group relative flex items-start gap-2 rounded-2xl px-2.5 py-2.5 transition-colors duration-(--duration-hover) ease-spring",
        failed
          ? "bg-destructive/5 hover:bg-destructive/10"
          : source
            ? "hover:bg-muted/55"
            : undefined,
      )}
    >
      {source && !failed ? (
        <button
          type="button"
          className="absolute inset-0 z-0 rounded-2xl"
          aria-label={`Open ${label}`}
          onClick={() => onPreview(source._id)}
        />
      ) : null}

      <span
        className={cn(
          "pointer-events-none relative z-10 mt-0.5",
          failed ? "text-destructive" : "text-primary",
        )}
      >
        {busy ? (
          <Spinner aria-hidden className="size-4.5" />
        ) : failed ? (
          <CircleAlert size={18} strokeWidth={1.5} aria-hidden />
        ) : (
          <Icon size={18} strokeWidth={1.5} />
        )}
      </span>

      <span className="pointer-events-none relative z-10 min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-medium">{label}</span>

        <span
          className={cn(
            "mt-0.5 block text-xs",
            failed ? "text-destructive" : "text-muted-foreground",
          )}
          role={busy || failed ? "status" : undefined}
        >
          {statusText}
        </span>
      </span>

      <div className="relative z-10 flex items-center gap-1">{trailing}</div>
    </div>
  )
})
