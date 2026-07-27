import { MoreHorizontal } from "lucide-react"
import { Button } from "src/components/ui/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/ui/shadcn/dropdown-menu"
import type { Doc, Id } from "src/convex/_generated/dataModel"

export type SourceListItemMenuProps = {
  label: string
  source: Doc<"sources">
  failed: boolean
  onRename: (source: Doc<"sources">) => void
  onRetry: (sourceId: Id<"sources">) => void
  onDelete: (sourceId: Id<"sources">) => void
}

export function SourceListItemMenu({
  label,
  source,
  failed,
  onRename,
  onRetry,
  onDelete,
}: SourceListItemMenuProps) {
  return (
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
  )
}
