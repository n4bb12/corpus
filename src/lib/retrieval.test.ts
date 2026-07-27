import { describe, expect, test } from "bun:test"
import {
  mergeRetrievalCandidates,
  selectEvidenceWithinBudget,
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
})
