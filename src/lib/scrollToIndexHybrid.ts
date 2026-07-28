/** Offset to jump to before a short smooth scroll, or null if already near. */
export function nearScrollOffset(options: {
  currentOffset: number
  targetOffset: number
  viewportSize: number
}) {
  const smoothDistance = Math.max(options.viewportSize, 1)
  const distance = Math.abs(options.targetOffset - options.currentOffset)

  if (distance <= smoothDistance) {
    return null
  }

  const direction = options.targetOffset > options.currentOffset ? 1 : -1

  return options.targetOffset - direction * smoothDistance
}

/** Jump long distances instantly, then smooth-scroll about one viewport. */
export function scrollToIndexHybrid(options: {
  virtualizer: {
    getOffsetForIndex: (
      index: number,
      align: "center",
    ) => readonly [number, string] | undefined
    scrollToOffset: (
      offset: number,
      options?: { behavior?: ScrollBehavior },
    ) => void
    scrollToIndex: (
      index: number,
      options?: { align: "center"; behavior?: ScrollBehavior },
    ) => void
  }
  index: number
  scrollElement: { scrollTop: number; clientHeight: number }
  requestAnimationFrame?: (cb: FrameRequestCallback) => number
  cancelAnimationFrame?: (id: number) => void
}) {
  const raf = options.requestAnimationFrame ?? requestAnimationFrame
  const caf = options.cancelAnimationFrame ?? cancelAnimationFrame

  const finishSmooth = () => {
    options.virtualizer.scrollToIndex(options.index, {
      align: "center",
      behavior: "smooth",
    })
  }

  const offsetInfo = options.virtualizer.getOffsetForIndex(
    options.index,
    "center",
  )

  if (!offsetInfo) {
    finishSmooth()

    return () => {}
  }

  const [targetOffset] = offsetInfo
  const jumpTo = nearScrollOffset({
    currentOffset: options.scrollElement.scrollTop,
    targetOffset,
    viewportSize: options.scrollElement.clientHeight,
  })

  if (jumpTo === null) {
    finishSmooth()

    return () => {}
  }

  options.virtualizer.scrollToOffset(jumpTo, { behavior: "auto" })

  let cancelled = false
  const frameId = raf(() => {
    if (cancelled) {
      return
    }

    finishSmooth()
  })

  return () => {
    cancelled = true
    caf(frameId)
  }
}
