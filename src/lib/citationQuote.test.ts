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

  test("matches a plain quote against markdown bold markers", () => {
    const chunkText =
      "**Wichtiger Hinweis:** Der **Schulmanager** wird am 31.07.2026 abgeschaltet."

    expect(
      resolveCitationQuote({
        chunkText,
        startOffset: 50,
        endOffset: 50 + chunkText.length,
        ordinal: 1,
        quote:
          "Wichtiger Hinweis: Der Schulmanager wird am 31.07.2026 abgeschaltet.",
      }),
    ).toMatchInlineSnapshot(`
      {
        "excerpt": "Wichtiger Hinweis:** Der **Schulmanager** wird am 31.07.2026 abgeschaltet.",
        "locator": {
          "endOffset": 126,
          "ordinal": 1,
          "startOffset": 52,
        },
      }
    `)
  })

  test("clamps a multi-paragraph match to the paragraph that supports the quote", () => {
    const chunkText =
      "Datenschutz und Formular.\n\n**Wichtiger Hinweis:** Schulmanager Ende 31.07.2026.\n\nMit freundlichen Grüßen."

    expect(
      resolveCitationQuote({
        chunkText,
        startOffset: 0,
        endOffset: chunkText.length,
        ordinal: 0,
        quote: "Schulmanager Ende 31.07.2026",
      }),
    ).toMatchInlineSnapshot(`
      {
        "excerpt": "Schulmanager Ende 31.07.2026",
        "locator": {
          "endOffset": 78,
          "ordinal": 0,
          "startOffset": 50,
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
