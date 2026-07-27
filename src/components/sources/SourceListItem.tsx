import {
  CircleAlert,
  FileText,
  Link as LinkIcon,
  MoreHorizontal,
  Type,
} from "lucide-react"
import { memo } from "react"
import { Button } from "src/components/ui/shadcn/button"
import { Checkbox } from "src/components/ui/shadcn/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/ui/shadcn/dropdown-menu"
import { Label } from "src/components/ui/shadcn/label"
import { Spinner } from "src/components/ui/shadcn/spinner"
import type { Doc, Id } from "src/convex/_generated/dataModel"
import { formatTitle } from "src/lib/sourceTitle"
import { cn } from "src/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting",
  extracting: "Reading",
  chunking: "Preparing",
  embedding: "Indexing",
  ready: "Ready",
  failed: "Couldn't process",
}

export type SourceListItemProps = {
  source: Doc<"sources">
  onPreview: (sourceId: Id<"sources">) => void
  onRename: (source: Doc<"sources">) => void
  onRetry: (sourceId: Id<"sources">) => void
  onDelete: (sourceId: Id<"sources">) => void
  onSelect: (sourceId: Id<"sources">, selected: boolean) => void
}

export const SourceListItem = memo(function SourceListItem({
  source,
  onPreview,
  onRename,
  onRetry,
  onDelete,
  onSelect,
}: SourceListItemProps) {
  const Icon =
    source.kind === "url" ? LinkIcon : source.kind === "file" ? FileText : Type
  const failed = source.processingState === "failed"
  const busy =
    source.processingState !== "ready" && source.processingState !== "failed"
  const checkboxId = `source-select-${source._id}`
  const label = formatTitle(source.title)
  const statusText = failed
    ? source.errorCode || STATUS_LABEL.failed
    : STATUS_LABEL[source.processingState]

  return (
    <div
      className={cn(
        "group relative flex items-start gap-2 rounded-2xl px-2.5 py-2.5 transition-colors duration-(--duration-hover) ease-spring",
        failed
          ? "bg-destructive/5 hover:bg-destructive/10"
          : "hover:bg-muted/55",
      )}
    >
      <button
        type="button"
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={failed ? `Open ${label}, failed` : `Open ${label}`}
        onClick={() => onPreview(source._id)}
      />

      <span
        className={cn(
          "pointer-events-none relative z-10 mt-0.5",
          failed ? "text-destructive" : "text-primary",
        )}
      >
        {busy ? (
          <Spinner
            aria-label={statusText ?? "Processing"}
            className="size-4.5"
          />
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
          role={failed ? "status" : undefined}
        >
          {statusText}
        </span>
      </span>

      <div className="relative z-10 flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="rounded-sm opacity-100 touch-manipulation md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              aria-label={`Source menu for ${label}`}
            >
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => onRename(source)}>
              Rename
            </DropdownMenuItem>

            {failed ? (
              <DropdownMenuItem onClick={() => onRetry(source._id)}>
                Retry
              </DropdownMenuItem>
            ) : null}

            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(source._id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Label
          htmlFor={checkboxId}
          className="flex cursor-pointer items-center gap-2"
        >
          <span className="sr-only">Select {label}</span>

          <Checkbox
            id={checkboxId}
            checked={source.selected}
            disabled={failed}
            onCheckedChange={(checked) =>
              onSelect(source._id, checked === true)
            }
          />
        </Label>
      </div>
    </div>
  )
})
