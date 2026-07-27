import { ArrowUpRight } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { Button } from "src/components/ui/shadcn/button"
import { cn } from "src/lib/utils"

export type IslandCtaProps = ComponentProps<typeof Button> & {
  children: ReactNode
  showArrow?: boolean
}

export function IslandCta({
  children,
  className,
  showArrow = true,
  ...props
}: IslandCtaProps) {
  return (
    <Button
      className={cn(
        "group h-11 gap-2 rounded-full px-5 pr-2 font-medium",
        className,
      )}
      {...props}
    >
      <span className="inline-flex items-center pl-1">{children}</span>
      {showArrow ? (
        <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/15 transition-transform duration-(--duration-hover) ease-spring group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105 dark:bg-primary-foreground/20">
          <ArrowUpRight size={16} aria-hidden />
        </span>
      ) : null}
    </Button>
  )
}
