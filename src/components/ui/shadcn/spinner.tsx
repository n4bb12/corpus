import { Loader2Icon } from "lucide-react"
import { type ComponentProps, memo } from "react"
import { cn } from "src/lib/utils"

export const Spinner = memo(function Spinner({
  className,
  ...props
}: ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
})
