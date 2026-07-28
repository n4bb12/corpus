/** Schedule a one-shot scroll; do not mark the key until the scroll actually runs. */
export function scheduleScrollOnce(options: {
  key: string
  scrolledKey: { current: string | null }
  isReady?: () => boolean
  scroll: () => void
  requestAnimationFrame?: (cb: FrameRequestCallback) => number
  cancelAnimationFrame?: (id: number) => void
}) {
  const raf = options.requestAnimationFrame ?? requestAnimationFrame
  const caf = options.cancelAnimationFrame ?? cancelAnimationFrame

  if (options.scrolledKey.current === options.key) {
    return () => {}
  }

  let frameId = 0
  let cancelled = false

  const tick = () => {
    if (cancelled) {
      return
    }

    if (options.isReady && !options.isReady()) {
      frameId = raf(tick)
      return
    }

    options.scrolledKey.current = options.key
    options.scroll()
  }

  frameId = raf(tick)

  return () => {
    cancelled = true
    caf(frameId)
  }
}
