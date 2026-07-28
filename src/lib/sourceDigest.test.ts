import { describe, expect, test } from "bun:test"
import {
  addMissingDigestCitationFallbacks,
  clampDigestText,
  formatDigestEvidence,
  isCorpusSummaryPrompt,
  validateDigestCitations,
} from "./sourceDigest"

describe("source digests", () => {
  test("keeps only citations whose quotes appear in the chunk", () => {
    const chunks = new Map([
      [
        "c1",
        {
          chunkId: "c1",
          text: "Alpha paragraph about soil moisture.",
          startOffset: 0,
          endOffset: 36,
          ordinal: 0,
        },
      ],
      [
        "c2",
        {
          chunkId: "c2",
          text: "Beta line on pine resin.",
          startOffset: 40,
          endOffset: 64,
          ordinal: 1,
        },
      ],
    ])

    expect(
      validateDigestCitations(
        [
          { chunkId: "c1", quote: "soil moisture" },
          { chunkId: "c2", quote: "invented claim" },
          { chunkId: "missing", quote: "soil moisture" },
        ],
        chunks,
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "chunkId": "c1",
          "locator": {
            "endOffset": 35,
            "ordinal": 0,
            "startOffset": 22,
          },
          "quote": "soil moisture",
        },
      ]
    `)
  })

  test("clamps long digest text near a sentence break", () => {
    const sentence = "Claim one is grounded. "
    const long = sentence.repeat(50)

    expect(clampDigestText(long).endsWith(".")).toBe(true)
    expect(clampDigestText(long).length).toBeLessThanOrEqual(800)
  })

  test("detects summary-like corpus prompts", () => {
    expect(
      isCorpusSummaryPrompt("Give me a concise brief of the sources."),
    ).toBe(true)
    expect(isCorpusSummaryPrompt("Where do these sources disagree?")).toBe(
      false,
    )
  })

  test("formats digest evidence under source titles", () => {
    expect(
      formatDigestEvidence(
        [
          {
            sourceId: "s2",
            title: "Biblebots",
            digestText: "Mission overview.",
            citations: [{ chunkId: "c2", quote: "serve communities" }],
          },
          {
            sourceId: "s1",
            title: "Elternbrief",
            digestText: "School portal letter.",
            citations: [{ chunkId: "c1", quote: "Infoportal startet" }],
          },
        ],
        ["s1", "s2"],
      ),
    ).toMatchInlineSnapshot(`
      "### Elternbrief
      sourceId:s1

      Digest:
      School portal letter.

      Supporting quotes:
      [1] chunk:c1
      Infoportal startet

      ### Biblebots
      sourceId:s2

      Digest:
      Mission overview.

      Supporting quotes:
      [2] chunk:c2
      serve communities"
    `)
  })

  test("adds fallback quotes only to digest sections without citations", () => {
    const sections = [
      {
        sourceId: "s1",
        title: "One",
        digestText: "First digest.",
        citations: [
          { chunkId: "s1-c1", quote: "First quote." },
          { chunkId: "s1-c2", quote: "Second quote." },
        ],
      },
      {
        sourceId: "s2",
        title: "Two",
        digestText: "Second digest.",
        citations: [],
      },
      {
        sourceId: "s3",
        title: "Three",
        digestText: "Third digest.",
        citations: [{ chunkId: "s3-c1", quote: "Third quote." }],
      },
      {
        sourceId: "s4",
        title: "Four",
        digestText: "Fourth digest.",
        citations: [],
      },
    ]

    const filled = addMissingDigestCitationFallbacks(sections, [
      {
        chunkId: "s2-c1",
        sourceId: "s2",
        text: "Fallback quote for source two.",
        startOffset: 0,
        endOffset: 30,
        ordinal: 0,
      },
      {
        chunkId: "s4-c1",
        sourceId: "s4",
        text: "Fallback quote for source four.",
        startOffset: 0,
        endOffset: 31,
        ordinal: 0,
      },
    ])

    expect(
      filled.map((section) => ({
        sourceId: section.sourceId,
        citationChunkIds: section.citations.map((citation) => citation.chunkId),
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "citationChunkIds": [
            "s1-c1",
            "s1-c2",
          ],
          "sourceId": "s1",
        },
        {
          "citationChunkIds": [
            "s2-c1",
          ],
          "sourceId": "s2",
        },
        {
          "citationChunkIds": [
            "s3-c1",
          ],
          "sourceId": "s3",
        },
        {
          "citationChunkIds": [
            "s4-c1",
          ],
          "sourceId": "s4",
        },
      ]
    `)
  })

  test("lists selected sources missing digests", () => {
    expect(
      formatDigestEvidence(
        [
          {
            sourceId: "s1",
            title: "One",
            digestText: "Only one.",
            citations: [],
          },
        ],
        ["s1", "s2"],
      ),
    ).toMatchInlineSnapshot(`
      "### One
      sourceId:s1

      Digest:
      Only one.

      Supporting quotes:
      (no supporting quotes)

      ### Sources with no digest in this pack
      - sourceId:s2"
    `)
  })
})
