import { describe, expect, test } from "bun:test"
import {
  EVIDENCE_CHARACTER_BUDGET,
  maxChunksPerSourceForBudget,
  mergeRetrievalCandidates,
  packCoverageEvidence,
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

  test("packs coverage round-robin across sources by ordinal", () => {
    expect(
      packCoverageEvidence(
        [
          {
            chunkId: "s2-1",
            sourceId: "s2",
            text: "bbbb",
            startOffset: 4,
            endOffset: 8,
            ordinal: 1,
          },
          {
            chunkId: "s1-0",
            sourceId: "s1",
            text: "aa",
            startOffset: 0,
            endOffset: 2,
            ordinal: 0,
          },
          {
            chunkId: "s2-0",
            sourceId: "s2",
            text: "bb",
            startOffset: 0,
            endOffset: 2,
            ordinal: 0,
          },
          {
            chunkId: "s1-1",
            sourceId: "s1",
            text: "aaaa",
            startOffset: 2,
            endOffset: 6,
            ordinal: 1,
          },
        ],
        100,
      ).map((item) => item.chunkId),
    ).toMatchInlineSnapshot(`
      [
        "s1-0",
        "s2-0",
        "s1-1",
        "s2-1",
      ]
    `)
  })

  test("coverage pack stays within budget and keeps per-source fairness", () => {
    const packed = packCoverageEvidence(
      [
        {
          chunkId: "a0",
          sourceId: "a",
          text: "1111",
          startOffset: 0,
          endOffset: 4,
          ordinal: 0,
        },
        {
          chunkId: "a1",
          sourceId: "a",
          text: "2222",
          startOffset: 4,
          endOffset: 8,
          ordinal: 1,
        },
        {
          chunkId: "b0",
          sourceId: "b",
          text: "3333",
          startOffset: 0,
          endOffset: 4,
          ordinal: 0,
        },
        {
          chunkId: "b1",
          sourceId: "b",
          text: "4444",
          startOffset: 4,
          endOffset: 8,
          ordinal: 1,
        },
      ],
      10,
    )

    expect(packed.map((item) => item.chunkId)).toMatchInlineSnapshot(`
      [
        "a0",
        "b0",
      ]
    `)
    expect(
      packed.every((item) => item.channel === "coverage"),
    ).toMatchInlineSnapshot(`true`)
  })

  test("bounds per-source chunk reads for an evidence budget", () => {
    expect(
      maxChunksPerSourceForBudget(1, EVIDENCE_CHARACTER_BUDGET),
    ).toMatchInlineSnapshot(`151`)
    expect(
      maxChunksPerSourceForBudget(20, EVIDENCE_CHARACTER_BUDGET),
    ).toMatchInlineSnapshot(`9`)
    expect(
      maxChunksPerSourceForBudget(0, EVIDENCE_CHARACTER_BUDGET),
    ).toMatchInlineSnapshot(`0`)
  })
})
