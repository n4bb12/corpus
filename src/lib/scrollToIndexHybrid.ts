/**
 * How far to leave for the smooth leg after a long-distance jump.
 * A viewport and a half is enough ease-out motion without dragging
 * through the whole document.
 */
export const SMOOTH_SCROLL_VIEWPORTS = 1.5

/** Frames the target offset must stay unchanged after a jump before smooth. */
const SETTLE_STABLE_FRAMES = 2

/** Cap settle wait so a noisy measure loop cannot stall forever. */
const SETTLE_MAX_FRAMES = 12

/** Default duration for a one-viewport ease-out scroll. */
const SMOOTH_DURATION_MS = 750

/** https://easings.net/#easeOutQuint */
export function easeOutQuint(t: number) {
  const clamped = Math.min(1, Math.max(0, t))

  return 1 - (1 - clamped) ** 5
}

/** Offset to jump to before a short smooth scroll, or null if already near. */
export function nearScrollOffset(options: {
  currentOffset: number
  targetOffset: number
  viewportSize: number
}) {
  const smoothDistance =
    Math.max(options.viewportSize, 1) * SMOOTH_SCROLL_VIEWPORTS
  const distance = Math.abs(options.targetOffset - options.currentOffset)

  if (distance <= smoothDistance) {
    return null
  }

  const direction = options.targetOffset > options.currentOffset ? 1 : -1

  return options.targetOffset - direction * smoothDistance
}

type HybridScrollElement = {
  scrollTop: number
  clientHeight: number
}

/** Animate scrollTop with ease-out quint. Returns a cancel function. */
export function animateScrollTop(options: {
  scrollElement: HybridScrollElement
  to: number
  durationMs?: number
  ease?: (t: number) => number
  requestAnimationFrame?: (cb: FrameRequestCallback) => number
  cancelAnimationFrame?: (id: number) => void
}) {
  const raf = options.requestAnimationFrame ?? requestAnimationFrame
  const caf = options.cancelAnimationFrame ?? cancelAnimationFrame
  const ease = options.ease ?? easeOutQuint
  const durationMs = options.durationMs ?? SMOOTH_DURATION_MS
  const from = options.scrollElement.scrollTop
  const delta = options.to - from

  if (delta === 0 || durationMs <= 0) {
    options.scrollElement.scrollTop = options.to

    return () => {}
  }

  let cancelled = false
  let frameId = 0
  let start: number | undefined

  const tick = (now: number) => {
    if (cancelled) {
      return
    }

    if (start === undefined) {
      start = now
    }

    const t = Math.min(1, (now - start) / durationMs)
    options.scrollElement.scrollTop = from + delta * ease(t)

    if (t < 1) {
      frameId = raf(tick)
      return
    }

    options.scrollElement.scrollTop = options.to
  }

  frameId = raf(tick)

  return () => {
    cancelled = true
    caf(frameId)
  }
}

/**
 * Jump long distances instantly, then ease-out scroll the last stretch.
 *
 * Uses a custom ease-out animation instead of native `behavior: "smooth"`
 * (ease-in-out) or TanStack `scrollToIndex({ behavior: "smooth" })` (which
 * restricts measurement mid-flight and restarts when the target shifts).
 */
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
  }
  index: number
  scrollElement: HybridScrollElement
  requestAnimationFrame?: (cb: FrameRequestCallback) => number
  cancelAnimationFrame?: (id: number) => void
}) {
  const raf = options.requestAnimationFrame ?? requestAnimationFrame
  const caf = options.cancelAnimationFrame ?? cancelAnimationFrame

  let cancelAnimate = () => {}

  const finishSmooth = () => {
    const offsetInfo = options.virtualizer.getOffsetForIndex(
      options.index,
      "center",
    )

    if (!offsetInfo) {
      return
    }

    cancelAnimate = animateScrollTop({
      scrollElement: options.scrollElement,
      to: offsetInfo[0],
      requestAnimationFrame: raf,
      cancelAnimationFrame: caf,
    })
  }

  const offsetInfo = options.virtualizer.getOffsetForIndex(
    options.index,
    "center",
  )

  if (!offsetInfo) {
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

    return () => {
      cancelAnimate()
    }
  }

  options.virtualizer.scrollToOffset(jumpTo, { behavior: "auto" })

  let cancelled = false
  let frameId = 0
  let lastOffset: number | undefined
  let stableFrames = 0
  let settleFrames = 0

  const settle = () => {
    if (cancelled) {
      return
    }

    settleFrames += 1
    const next = options.virtualizer.getOffsetForIndex(
      options.index,
      "center",
    )?.[0]

    if (next === lastOffset) {
      stableFrames += 1
    } else {
      lastOffset = next
      stableFrames = 0
    }

    if (
      stableFrames >= SETTLE_STABLE_FRAMES ||
      settleFrames >= SETTLE_MAX_FRAMES
    ) {
      finishSmooth()
      return
    }

    frameId = raf(settle)
  }

  frameId = raf(settle)

  return () => {
    cancelled = true
    caf(frameId)
    cancelAnimate()
  }
}
