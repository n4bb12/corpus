import { describe, expect, test } from "bun:test"
import { resolveCitationQuote } from "./citationQuote"

describe("citationQuote", () => {
  test("resolves a verbatim quote to a tight locator inside the chunk", () => {
    const chunkText =
      "Alpha paragraph about soil.\n\nBeta line on pine resin.\n\nGamma closing note."

    expect(
      resolveCitationQuote({
        chunkText,
        startOffset: 100,
        endOffset: 100 + chunkText.length,
        ordinal: 3,
        quote: "Beta line on pine resin.",
      }),
    ).toMatchInlineSnapshot(`
      {
        "excerpt": "Beta line on pine resin.",
        "locator": {
          "endOffset": 153,
          "ordinal": 3,
          "startOffset": 129,
        },
      }
    `)
  })

  test("matches quotes after trim and whitespace collapse", () => {
    const chunkText = "First  line.\n\nSecond   line here."

    expect(
      resolveCitationQuote({
        chunkText,
        startOffset: 0,
        endOffset: chunkText.length,
        ordinal: 0,
        quote: "  Second line here.  ",
      }),
    ).toMatchInlineSnapshot(`
      {
        "excerpt": "Second   line here.",
        "locator": {
          "endOffset": 33,
          "ordinal": 0,
          "startOffset": 14,
        },
      }
    `)
  })

  test("returns null when the quote is not in the chunk", () => {
    expect(
      resolveCitationQuote({
        chunkText: "Only this text.",
        startOffset: 10,
        endOffset: 25,
        ordinal: 1,
        quote: "missing",
      }),
    ).toMatchInlineSnapshot(`null`)
  })
})
