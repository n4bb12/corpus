import { describe, expect, test } from "bun:test"
import {
  animateScrollTop,
  easeOutQuint,
  nearScrollOffset,
  SMOOTH_SCROLL_VIEWPORTS,
  scrollToIndexHybrid,
} from "./scrollToIndexHybrid"

function createFrameClock(startTime = 0) {
  let nextId = 1
  let time = startTime
  const pending = new Map<number, FrameRequestCallback>()

  return {
    get time() {
      return time
    },
    requestAnimationFrame(cb: FrameRequestCallback) {
      const id = nextId++
      pending.set(id, cb)

      return id
    },
    cancelAnimationFrame(id: number) {
      pending.delete(id)
    },
    flush(advanceMs = 16) {
      time += advanceMs
      const callbacks = [...pending.values()]
      pending.clear()

      for (const cb of callbacks) {
        cb(time)
      }
    },
    get pendingCount() {
      return pending.size
    },
  }
}

function createScrollElement(scrollTop: number, clientHeight: number) {
  return {
    scrollTop,
    clientHeight,
  }
}

describe("easeOutQuint", () => {
  test("moves most of the distance early, then decelerates", () => {
    expect({
      at0: easeOutQuint(0),
      atQuarter: easeOutQuint(0.25),
      atHalf: easeOutQuint(0.5),
      atThreeQuarter: easeOutQuint(0.75),
      atEnd: easeOutQuint(1),
    }).toMatchInlineSnapshot(`
      {
        "at0": 0,
        "atEnd": 1,
        "atHalf": 0.96875,
        "atQuarter": 0.7626953125,
        "atThreeQuarter": 0.9990234375,
      }
    `)
  })
})

describe("nearScrollOffset", () => {
  test("returns null when already within the smooth window", () => {
    expect(
      nearScrollOffset({
        currentOffset: 100,
        targetOffset: 500,
        viewportSize: 400,
      }),
    ).toMatchInlineSnapshot(`null`)
  })

  test("jumps forward leaving a viewport-and-a-half for the smooth leg", () => {
    const viewportSize = 800
    const targetOffset = 5000
    const jumpTo = nearScrollOffset({
      currentOffset: 0,
      targetOffset,
      viewportSize,
    })

    expect(jumpTo).toMatchInlineSnapshot(`3800`)

    const remaining = targetOffset - (jumpTo as number)

    expect(remaining).toBe(viewportSize * SMOOTH_SCROLL_VIEWPORTS)
  })

  test("jumps backward leaving the same smooth window past the target", () => {
    expect(
      nearScrollOffset({
        currentOffset: 5000,
        targetOffset: 200,
        viewportSize: 800,
      }),
    ).toMatchInlineSnapshot(`1400`)
  })
})

describe("animateScrollTop", () => {
  test("ease-out reaches the target over the duration", () => {
    const clock = createFrameClock()
    const scrollElement = createScrollElement(100, 800)

    animateScrollTop({
      scrollElement,
      to: 500,
      durationMs: 400,
      requestAnimationFrame: clock.requestAnimationFrame,
      cancelAnimationFrame: clock.cancelAnimationFrame,
    })

    clock.flush(0)
    const early = scrollElement.scrollTop

    clock.flush(100)
    const quarter = scrollElement.scrollTop

    clock.flush(400)
    expect({
      early,
      quarter,
      done: scrollElement.scrollTop,
      pending: clock.pendingCount,
    }).toMatchInlineSnapshot(`
      {
        "done": 500,
        "early": 100,
        "pending": 0,
        "quarter": 405.078125,
      }
    `)

    expect(quarter - 100).toBeGreaterThan((500 - 100) * 0.5)
  })
})

describe("scrollToIndexHybrid", () => {
  test("ease-out scrolls when the target is nearby", () => {
    const clock = createFrameClock()
    const scrollElement = createScrollElement(100, 800)
    const offsetCalls: number[] = []

    scrollToIndexHybrid({
      index: 3,
      scrollElement,
      virtualizer: {
        getOffsetForIndex: () => [400, "center"],
        scrollToOffset: (offset) => {
          offsetCalls.push(offset)
        },
      },
      requestAnimationFrame: clock.requestAnimationFrame,
      cancelAnimationFrame: clock.cancelAnimationFrame,
    })

    expect({
      offsetCalls,
      pending: clock.pendingCount,
      scrollTop: scrollElement.scrollTop,
    }).toMatchInlineSnapshot(`
      {
        "offsetCalls": [],
        "pending": 1,
        "scrollTop": 100,
      }
    `)

    clock.flush(0)
    clock.flush(800)

    expect(scrollElement.scrollTop).toMatchInlineSnapshot(`400`)
  })

  test("jumps, waits for a stable target, then ease-out scrolls once", () => {
    const clock = createFrameClock()
    const scrollElement = createScrollElement(0, 800)
    const offsetCalls: Array<{ offset: number; behavior?: string }> = []
    let calls = 0

    scrollToIndexHybrid({
      index: 40,
      scrollElement,
      virtualizer: {
        getOffsetForIndex: () => {
          calls += 1

          if (calls === 1) {
            return [5000, "center"]
          }

          if (calls === 2) {
            return [5080, "center"]
          }

          return [5120, "center"]
        },
        scrollToOffset: (offset, options) => {
          offsetCalls.push({ offset, behavior: options?.behavior })
          scrollElement.scrollTop = offset
        },
      },
      requestAnimationFrame: clock.requestAnimationFrame,
      cancelAnimationFrame: clock.cancelAnimationFrame,
    })

    expect({
      offsetCalls,
      scrollTop: scrollElement.scrollTop,
      pending: clock.pendingCount,
    }).toMatchInlineSnapshot(`
      {
        "offsetCalls": [
          {
            "behavior": "auto",
            "offset": 3800,
          },
        ],
        "pending": 1,
        "scrollTop": 3800,
      }
    `)

    clock.flush() // settle sample 5080
    clock.flush() // 5120 changed
    clock.flush() // 5120 stable 1
    clock.flush() // 5120 stable 2 → start ease-out

    expect(scrollElement.scrollTop).toMatchInlineSnapshot(`3800`)
    expect(clock.pendingCount).toMatchInlineSnapshot(`1`)

    clock.flush(0)
    clock.flush(800)

    expect(scrollElement.scrollTop).toMatchInlineSnapshot(`5120`)
  })

  test("cancel skips the smooth leg after a jump", () => {
    const clock = createFrameClock()
    const scrollElement = createScrollElement(0, 800)
    const offsetCalls: number[] = []

    const cancel = scrollToIndexHybrid({
      index: 40,
      scrollElement,
      virtualizer: {
        getOffsetForIndex: () => [5000, "center"],
        scrollToOffset: (offset) => {
          offsetCalls.push(offset)
        },
      },
      requestAnimationFrame: clock.requestAnimationFrame,
      cancelAnimationFrame: clock.cancelAnimationFrame,
    })

    cancel()
    clock.flush()
    clock.flush()

    expect({
      offsetCalls,
      scrollTop: scrollElement.scrollTop,
      pending: clock.pendingCount,
    }).toMatchInlineSnapshot(`
      {
        "offsetCalls": [
          3800,
        ],
        "pending": 0,
        "scrollTop": 0,
      }
    `)
  })
})
