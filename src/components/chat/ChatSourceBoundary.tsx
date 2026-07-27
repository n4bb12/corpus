import { Layers } from "lucide-react"

export type ChatSourceBoundaryProps = {
  activeSourceCount: number
}

export function ChatSourceBoundary({
  activeSourceCount,
}: ChatSourceBoundaryProps) {
  return (
    <div className="mx-auto flex w-full max-w-100 items-center gap-4 py-2 text-muted-foreground">
      <div className="h-px min-w-4 flex-1 bg-border" />
      <p className="flex shrink-0 items-center gap-1.5 text-xs">
        <Layers size={12} aria-hidden />
        <span>Sources changed · {activeSourceCount} selected</span>
      </p>
      <div className="h-px min-w-4 flex-1 bg-border" />
    </div>
  )
}
