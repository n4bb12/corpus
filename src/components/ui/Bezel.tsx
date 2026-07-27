import type { ReactNode } from "react"
import { cn } from "src/lib/utils"

export type BezelProps = {
  children: ReactNode
  className?: string
  innerClassName?: string
}

export function Bezel({ children, className, innerClassName }: BezelProps) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-foreground/4 p-1.5 ring-1 ring-foreground/5",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-lg bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  )
}
