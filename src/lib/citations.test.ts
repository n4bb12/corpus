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
          {
            "chunkId": "c1",
            "quote": "alpha again",
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

    expect(
      buildCitedMarkdown(
        [
          {
            text: "Two facts.",
            citations: [
              { chunkId: "c1", quote: "first" },
              { chunkId: "c1", quote: "second" },
            ],
          },
        ],
        new Set(["c1"]),
        {
          markerStyle: "numbered",
          chunkTextById: new Map([
            ["c1", "Paragraph about first.\n\nParagraph about second."],
          ]),
        },
      ),
    ).toMatchInlineSnapshot(`
      {
        "citations": [
          {
            "chunkId": "c1",
            "quote": "first",
          },
          {
            "chunkId": "c1",
            "quote": "second",
          },
        ],
        "content": "Two facts. [[cite:1]] [[cite:2]]",
        "invalid": [],
      }
    `)

    expect(
      buildCitedMarkdown(
        [
          {
            text: "Infoportal und Schulmanager.",
            citations: [
              { chunkId: "c1", quote: "Infoportal umgestellt" },
              {
                chunkId: "c1",
                quote: "Elternkommunikation wird auf das Infoportal",
              },
              {
                chunkId: "c1",
                quote: "Schulmanager wird durch das Infoportal",
              },
              { chunkId: "c1", quote: "Infoportal ersetzt" },
            ],
          },
        ],
        new Set(["c1"]),
        {
          markerStyle: "numbered",
          chunkTextById: new Map([
            [
              "c1",
              "Die Elternkommunikation wird auf das Infoportal umgestellt.\n\nDer Schulmanager wird durch das Infoportal ersetzt.",
            ],
          ]),
        },
      ),
    ).toMatchInlineSnapshot(`
      {
        "citations": [
          {
            "chunkId": "c1",
            "quote": "Elternkommunikation wird auf das Infoportal",
          },
          {
            "chunkId": "c1",
            "quote": "Schulmanager wird durch das Infoportal",
          },
        ],
        "content": "Infoportal und Schulmanager. [[cite:1]] [[cite:2]]",
        "invalid": [],
      }
    `)

    expect(
      buildCitedMarkdown(
        [
          {
            text: "Repeated passage.",
            citations: [
              { chunkId: "c1", quote: "Schulmanager Ende 31.07.2026" },
              { chunkId: "c1", quote: "Schulmanager Ende 31.07.2026." },
              { chunkId: "c1", quote: "Ende 31.07.2026" },
            ],
          },
        ],
        new Set(["c1"]),
        {
          markerStyle: "numbered",
          chunkTextById: new Map([
            [
              "c1",
              "Datenschutz und Formular.\n\n**Wichtiger Hinweis:** Schulmanager Ende 31.07.2026.\n\nMit freundlichen Grüßen.",
            ],
          ]),
        },
      ),
    ).toMatchInlineSnapshot(`
      {
        "citations": [
          {
            "chunkId": "c1",
            "quote": "Schulmanager Ende 31.07.2026.",
          },
        ],
        "content": "Repeated passage. [[cite:1]]",
        "invalid": [],
      }
    `)
  })

  test("holds trailing paragraph citations while streaming", () => {
    expect(
      buildCitedMarkdown(
        [
          {
            text: "First paragraph.",
            citations: [
              { chunkId: "c1", quote: "alpha one" },
              { chunkId: "c1", quote: "alpha two" },
            ],
          },
          {
            text: "Second still streaming.",
            citations: [{ chunkId: "c2", quote: "beta" }],
          },
        ],
        new Set(["c1", "c2"]),
        {
          markerStyle: "numbered",
          chunkTextById: new Map([
            ["c1", "Paragraph alpha one and alpha two."],
            ["c2", "Paragraph beta."],
          ]),
          holdTrailingParagraphCitations: true,
        },
      ),
    ).toMatchInlineSnapshot(`
      {
        "citations": [
          {
            "chunkId": "c1",
            "quote": "alpha one",
          },
        ],
        "content": 
      "First paragraph. [[cite:1]]

      Second still streaming."
      ,
        "invalid": [],
      }
    `)
  })

  test("ignores empty trailing paragraph shells while citations stream", () => {
    expect(
      buildCitedMarkdown(
        [
          {
            text: "First paragraph.",
            citations: [
              { chunkId: "c1", quote: "alpha one" },
              { chunkId: "c1", quote: "alpha two" },
            ],
          },
          {
            text: "",
            citations: [{ chunkId: "c2", quote: "beta streaming" }],
          },
        ],
        new Set(["c1", "c2"]),
        {
          markerStyle: "numbered",
          chunkTextById: new Map([
            ["c1", "Paragraph alpha one and alpha two."],
            ["c2", "Paragraph beta."],
          ]),
          holdTrailingParagraphCitations: true,
        },
      ),
    ).toMatchInlineSnapshot(`
      {
        "citations": [],
        "content": "First paragraph.",
        "invalid": [],
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
