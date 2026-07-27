import { describe, expect, test } from "bun:test"
import { chatTabEnterAnimate } from "src/components/notebook/chatTabMotion"

describe("chatTabEnterAnimate", () => {
  test("enters once on mobile chat; stays put on desktop", () => {
    expect(chatTabEnterAnimate("sources", false)).toMatchInlineSnapshot(`
      {
        "opacity": 0,
        "y": 8,
      }
    `)
    expect(chatTabEnterAnimate("chat", false)).toMatchInlineSnapshot(`
      {
        "opacity": 1,
        "y": 0,
      }
    `)
    expect(chatTabEnterAnimate("sources", true)).toMatchInlineSnapshot(`
      {
        "opacity": 1,
        "y": 0,
      }
    `)
    expect(chatTabEnterAnimate("chat", true)).toBe(
      chatTabEnterAnimate("sources", true),
    )
  })
})
