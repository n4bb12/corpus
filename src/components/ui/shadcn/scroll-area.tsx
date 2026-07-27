import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"
import {
  type ComponentProps,
  type Ref,
  type UIEventHandler,
  useEffect,
  useRef,
} from "react"
import { cn } from "src/lib/utils"

export type ScrollAreaProps = ComponentProps<
  typeof ScrollAreaPrimitive.Root
> & {
  viewportRef?: Ref<HTMLDivElement>
  onViewportScroll?: UIEventHandler<HTMLDivElement>
  /** Multiplier for wheel/trackpad scroll delta. Defaults to 1. */
  wheelSpeed?: number
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) {
    return
  }

  if (typeof ref === "function") {
    ref(value)
    return
  }

  ref.current = value
}

function ScrollArea({
  className,
  children,
  viewportRef,
  onViewportScroll,
  wheelSpeed = 1,
  ...props
}: ScrollAreaProps) {
  const localViewportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = localViewportRef.current

    if (!node || wheelSpeed === 1) {
      return
    }

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey || event.metaKey || !localViewportRef.current) {
        return
      }

      event.preventDefault()
      localViewportRef.current.scrollTop += event.deltaY * wheelSpeed
      localViewportRef.current.scrollLeft += event.deltaX * wheelSpeed
    }

    node.addEventListener("wheel", onWheel, { passive: false })

    return () => node.removeEventListener("wheel", onWheel)
  }, [wheelSpeed])

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={(node) => {
          localViewportRef.current = node
          assignRef(viewportRef, node)
        }}
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 [&>div]:!block [&>div]:min-w-0 [&>div]:w-full"
        onScroll={onViewportScroll}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
