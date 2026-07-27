import { describe, expect, test } from "bun:test"
import { resolveCitationQuote } from "./citationQuote"

describe("citationMatch", () => {
  test("prefers the occurrence that matches more of the quote", () => {
    const chunkText =
      "sämtliche dort in einem anderen Satz.\n\nAb dem 31.07.2026 sind sämtliche dort gespeicherten Daten gelöscht."

    expect(
      resolveCitationQuote({
        chunkText,
        startOffset: 0,
        endOffset: chunkText.length,
        ordinal: 0,
        quote:
          "sämtliche dort gespeicherten Daten, Nachrichten und Informationen nicht mehr verfügbar",
      }),
    ).toMatchInlineSnapshot(`
      {
        "excerpt": "sämtliche dort gespeicherten",
        "locator": {
          "endOffset": 90,
          "ordinal": 0,
          "startOffset": 62,
        },
      }
    `)
  })
})
