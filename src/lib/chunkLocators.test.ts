import { describe, expect, test } from "bun:test"
import { deriveChunkLocators } from "./chunkLocators"

describe("chunk locators", () => {
  test("derives offsets", () => {
    const text = "alpha beta gamma"
    expect(
      deriveChunkLocators(["alpha", "gamma"], text),
    ).toMatchInlineSnapshot(`
      [
        {
          "endOffset": 5,
          "ordinal": 0,
          "startOffset": 0,
        },
        {
          "endOffset": 16,
          "ordinal": 1,
          "startOffset": 11,
        },
      ]
    `)
  })
})
