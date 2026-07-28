import { describe, expect, test } from "bun:test"
import { nearScrollOffset, scrollToIndexHybrid } from "./scrollToIndexHybrid"

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

describe("nearScrollOffset", () => {
  test("returns null when already within one viewport", () => {
    expect(
      nearScrollOffset({
        currentOffset: 100,
        targetOffset: 500,
        viewportSize: 400,
      }),
    ).toMatchInlineSnapshot(`null`)
  })

  test("jumps forward to one viewport before the target", () => {
    expect(
      nearScrollOffset({
        currentOffset: 0,
        targetOffset: 5000,
        viewportSize: 800,
      }),
    ).toMatchInlineSnapshot(`4200`)
  })

  test("jumps backward to one viewport after the target", () => {
    expect(
      nearScrollOffset({
        currentOffset: 5000,
        targetOffset: 200,
        viewportSize: 800,
      }),
    ).toMatchInlineSnapshot(`1000`)
  })
})

describe("scrollToIndexHybrid", () => {
  test("smooth-scrolls only when the target is nearby", () => {
    const calls: Array<{ type: string; arg: number; behavior?: string }> = []
    const clock = createFrameClock()

    scrollToIndexHybrid({
      index: 3,
      scrollElement: { scrollTop: 100, clientHeight: 800 },
      virtualizer: {
        getOffsetForIndex: () => [400, "center"],
        scrollToOffset: (offset, options) => {
          calls.push({
            type: "offset",
            arg: offset,
            behavior: options?.behavior,
          })
        },
        scrollToIndex: (index, options) => {
          calls.push({
            type: "index",
            arg: index,
            behavior: options?.behavior,
          })
        },
      },
      requestAnimationFrame: clock.requestAnimationFrame,
      cancelAnimationFrame: clock.cancelAnimationFrame,
    })

    expect({ calls, pending: clock.pendingCount }).toMatchInlineSnapshot(`
      {
        "calls": [
          {
            "arg": 3,
            "behavior": "smooth",
            "type": "index",
          },
        ],
        "pending": 0,
      }
    `)
  })

  test("jumps near the target, then smooth-scrolls on the next frame", () => {
    const calls: Array<{ type: string; arg: number; behavior?: string }> = []
    const clock = createFrameClock()

    scrollToIndexHybrid({
      index: 40,
      scrollElement: { scrollTop: 0, clientHeight: 800 },
      virtualizer: {
        getOffsetForIndex: () => [5000, "center"],
        scrollToOffset: (offset, options) => {
          calls.push({
            type: "offset",
            arg: offset,
            behavior: options?.behavior,
          })
        },
        scrollToIndex: (index, options) => {
          calls.push({
            type: "index",
            arg: index,
            behavior: options?.behavior,
          })
        },
      },
      requestAnimationFrame: clock.requestAnimationFrame,
      cancelAnimationFrame: clock.cancelAnimationFrame,
    })

    expect({ calls, pending: clock.pendingCount }).toMatchInlineSnapshot(`
      {
        "calls": [
          {
            "arg": 4200,
            "behavior": "auto",
            "type": "offset",
          },
        ],
        "pending": 1,
      }
    `)

    clock.flush()

    expect(calls).toMatchInlineSnapshot(`
      [
        {
          "arg": 4200,
          "behavior": "auto",
          "type": "offset",
        },
        {
          "arg": 40,
          "behavior": "smooth",
          "type": "index",
        },
      ]
    `)
  })

  test("cancel skips the smooth leg after a jump", () => {
    const calls: Array<{ type: string; arg: number; behavior?: string }> = []
    const clock = createFrameClock()

    const cancel = scrollToIndexHybrid({
      index: 40,
      scrollElement: { scrollTop: 0, clientHeight: 800 },
      virtualizer: {
        getOffsetForIndex: () => [5000, "center"],
        scrollToOffset: (offset, options) => {
          calls.push({
            type: "offset",
            arg: offset,
            behavior: options?.behavior,
          })
        },
        scrollToIndex: (index, options) => {
          calls.push({
            type: "index",
            arg: index,
            behavior: options?.behavior,
          })
        },
      },
      requestAnimationFrame: clock.requestAnimationFrame,
      cancelAnimationFrame: clock.cancelAnimationFrame,
    })

    cancel()
    clock.flush()

    expect(calls).toMatchInlineSnapshot(`
      [
        {
          "arg": 4200,
          "behavior": "auto",
          "type": "offset",
        },
      ]
    `)
  })
})
