import { describe, expect, test } from "bun:test"
import {
  buildCitedMarkdown,
  joinParagraphText,
  parseCitationMarkers,
  splitCitedParagraphs,
  validateCitations,
} from "./citations"

describe("citations", () => {
  test("parses and validates markers", () => {
    const parsed = parseCitationMarkers("Hello [[cite:c1,c2]] world")
    expect(parsed.text).toMatchInlineSnapshot(
      `"Hello [[cite:1]] [[cite:2]] world"`,
    )
    expect(
      validateCitations(parsed.citations, new Set(["c1"])).valid,
    ).toMatchInlineSnapshot(`
      [
        {
          "chunkId": "c1",
        },
      ]
    `)
  })

  test("splits numbered markers onto paragraphs", () => {
    expect(
      splitCitedParagraphs(
        "First claim. [[cite:1]]\n\nSecond claim. [[cite:2]] [[cite:1]]",
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "citationIndexes": [
            1,
          ],
          "text": "First claim.",
        },
        {
          "citationIndexes": [
            2,
            1,
          ],
          "text": "Second claim.",
        },
      ]
    `)
  })

  test("builds cited markdown from structured paragraphs", () => {
    expect(
      buildCitedMarkdown(
        [
          {
            text: "First claim.",
            citations: [{ chunkId: "c1", quote: "alpha" }],
          },
          {
            text: "Second claim.",
            citations: [
              { chunkId: "c2", quote: "beta" },
              { chunkId: "c1", quote: "alpha again" },
              { chunkId: "bad", quote: "nope" },
            ],
          },
          { text: "  ", citations: [{ chunkId: "c3", quote: "gamma" }] },
        ],
        new Set(["c1", "c2"]),
      ),
    ).toMatchInlineSnapshot(`
      {
        "citations": [
          {
            "chunkId": "c1",
            "quote": "alpha",
          },
          {
            "chunkId": "c2",
            "quote": "beta",
          },
        ],
        "content": 
      "First claim. [[cite:c1]]

      Second claim. [[cite:c2]] [[cite:c1]]"
      ,
        "invalid": [
          "bad",
        ],
      }
    `)
  })

  test("joins paragraph text for streaming", () => {
    expect(
      joinParagraphText([
        { text: "Hello" },
        { text: " world " },
        undefined,
        { text: "" },
      ]),
    ).toMatchInlineSnapshot(`
      "Hello

      world"
    `)
  })
})
