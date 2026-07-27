import type { ReactNode } from "react"
import { Spinner } from "src/components/ui/shadcn/spinner"
import { cn } from "src/lib/utils"

export type PendingLabelProps = {
  pending: boolean
  children: ReactNode
  className?: string
  pendingLabel?: string
}

export function PendingLabel({
  pending,
  children,
  className,
  pendingLabel = "Loading",
}: PendingLabelProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 leading-none", className)}
    >
      {pending ? (
        <Spinner aria-label={pendingLabel} className="size-4 shrink-0" />
      ) : null}
      {children}
    </span>
  )
}
