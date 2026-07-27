import { describe, expect, test } from "bun:test"
import {
  mergeRetrievalCandidates,
  selectEvidenceWithinBudget,
  sourcesExceedEvidenceBudget,
  tryPackInlineEvidence,
} from "./retrieval"

describe("retrieval helpers", () => {
  test("merges and budgets evidence", () => {
    const merged = mergeRetrievalCandidates(
      [
        {
          chunkId: "a",
          sourceId: "s1",
          text: "one",
          score: 0.9,
          startOffset: 0,
          endOffset: 3,
          ordinal: 0,
        },
        {
          chunkId: "b",
          sourceId: "s1",
          text: "two",
          score: 0.4,
          startOffset: 4,
          endOffset: 7,
          ordinal: 1,
        },
      ],
      [
        {
          chunkId: "a",
          sourceId: "s1",
          text: "one",
          score: 0.5,
          startOffset: 0,
          endOffset: 3,
          ordinal: 0,
        },
      ],
    )

    expect(merged[0]?.channel).toMatchInlineSnapshot(`"both"`)
    expect(
      selectEvidenceWithinBudget(
        [
          {
            chunkId: "a",
            sourceId: "s1",
            text: "12345",
            score: 1,
            channel: "vector",
            startOffset: 0,
            endOffset: 5,
            ordinal: 0,
          },
          {
            chunkId: "b",
            sourceId: "s1",
            text: "67890",
            score: 0.5,
            channel: "text",
            startOffset: 5,
            endOffset: 10,
            ordinal: 1,
          },
        ],
        8,
      ).map((item) => item.chunkId),
    ).toMatchInlineSnapshot(`
      [
        "a",
      ]
    `)
  })

  test("detects when known source sizes already exceed the budget", () => {
    expect(
      sourcesExceedEvidenceBudget([4_000, 5_000], 8_000),
    ).toMatchInlineSnapshot(`true`)
    expect(
      sourcesExceedEvidenceBudget([3_000, 4_000], 8_000),
    ).toMatchInlineSnapshot(`false`)
    expect(
      sourcesExceedEvidenceBudget([3_000, undefined], 8_000),
    ).toMatchInlineSnapshot(`false`)
  })

  test("inlines every chunk when the full corpus fits", () => {
    expect(
      tryPackInlineEvidence(
        [
          {
            chunkId: "b",
            sourceId: "s1",
            text: "second",
            startOffset: 6,
            endOffset: 12,
            ordinal: 1,
          },
          {
            chunkId: "a",
            sourceId: "s1",
            text: "first",
            startOffset: 0,
            endOffset: 5,
            ordinal: 0,
          },
        ],
        20,
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "channel": "inline",
          "chunkId": "a",
          "endOffset": 5,
          "ordinal": 0,
          "score": 1,
          "sourceId": "s1",
          "startOffset": 0,
          "text": "first",
        },
        {
          "channel": "inline",
          "chunkId": "b",
          "endOffset": 12,
          "ordinal": 1,
          "score": 0.5,
          "sourceId": "s1",
          "startOffset": 6,
          "text": "second",
        },
      ]
    `)
  })

  test("refuses to inline when chunks overflow the budget", () => {
    expect(
      tryPackInlineEvidence(
        [
          {
            chunkId: "a",
            sourceId: "s1",
            text: "12345",
            startOffset: 0,
            endOffset: 5,
            ordinal: 0,
          },
          {
            chunkId: "b",
            sourceId: "s1",
            text: "67890",
            startOffset: 5,
            endOffset: 10,
            ordinal: 1,
          },
        ],
        8,
      ),
    ).toMatchInlineSnapshot(`null`)
  })
})
