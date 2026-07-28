import { describe, expect, test } from "bun:test"
import { scheduleScrollOnce } from "./scheduleScrollOnce"

function createFrameClock() {
  let nextId = 1
  const pending = new Map<number, FrameRequestCallback>()

  return {
    requestAnimationFrame(cb: FrameRequestCallback) {
      const id = nextId++
      pending.set(id, cb)
      return id
    },
    cancelAnimationFrame(id: number) {
      pending.delete(id)
    },
    flush() {
      const callbacks = [...pending.values()]
      pending.clear()

      for (const cb of callbacks) {
        cb(0)
      }
    },
    get pendingCount() {
      return pending.size
    },
  }
}

describe("scheduleScrollOnce", () => {
  test("mount → cleanup → remount still scrolls (Strict Mode / cancelled rAF)", () => {
    const clock = createFrameClock()
    const scrolledKey = { current: null as string | null }
    let scrolls = 0

    const run = () =>
      scheduleScrollOnce({
        key: "10:20:5",
        scrolledKey,
        scroll: () => {
          scrolls += 1
        },
        requestAnimationFrame: clock.requestAnimationFrame,
        cancelAnimationFrame: clock.cancelAnimationFrame,
      })

    const cleanup = run()
    cleanup()
    run()
    clock.flush()

    expect({
      scrolls,
      scrolledKey: scrolledKey.current,
    }).toMatchInlineSnapshot(`
      {
        "scrolledKey": "10:20:5",
        "scrolls": 1,
      }
    `)
  })

  test("retries until ready, then marks the key", () => {
    const clock = createFrameClock()
    const scrolledKey = { current: null as string | null }
    let ready = false
    let scrolls = 0

    scheduleScrollOnce({
      key: "1:2:3",
      scrolledKey,
      isReady: () => ready,
      scroll: () => {
        scrolls += 1
      },
      requestAnimationFrame: clock.requestAnimationFrame,
      cancelAnimationFrame: clock.cancelAnimationFrame,
    })

    clock.flush()
    expect({ scrolls, pending: clock.pendingCount }).toMatchInlineSnapshot(`
      {
        "pending": 1,
        "scrolls": 0,
      }
    `)

    ready = true
    clock.flush()

    expect({
      scrolls,
      scrolledKey: scrolledKey.current,
    }).toMatchInlineSnapshot(`
      {
        "scrolledKey": "1:2:3",
        "scrolls": 1,
      }
    `)
  })

  test("skips when the key was already scrolled", () => {
    const clock = createFrameClock()
    const scrolledKey = { current: "10:20:5" as string | null }
    let scrolls = 0

    scheduleScrollOnce({
      key: "10:20:5",
      scrolledKey,
      scroll: () => {
        scrolls += 1
      },
      requestAnimationFrame: clock.requestAnimationFrame,
      cancelAnimationFrame: clock.cancelAnimationFrame,
    })

    clock.flush()

    expect(scrolls).toMatchInlineSnapshot(`0`)
  })
})
