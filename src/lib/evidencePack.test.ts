import { describe, expect, test } from "bun:test"
import { buildDigestEvidencePack, packEvidence } from "src/lib/evidencePack"

describe("evidencePack", () => {
  test("builds digest evidence from ready rows and citation chunks", () => {
    const pack = buildDigestEvidencePack(
      [
        {
          sourceId: "s1",
          title: "Pine",
          digestText: "Resin seals wounds.",
          digestCitations: [{ chunkId: "c1", quote: "seals wounds" }],
        },
      ],
      [
        {
          chunkId: "c1",
          sourceId: "s1",
          text: "Pine resin seals wounds on the trunk.",
          startOffset: 0,
          endOffset: 40,
          ordinal: 0,
        },
      ],
    )

    expect(pack).toMatchInlineSnapshot(`
      {
        "digestSections": [
          {
            "citations": [
              {
                "chunkId": "c1",
                "quote": "seals wounds",
              },
            ],
            "digestText": "Resin seals wounds.",
            "sourceId": "s1",
            "title": "Pine",
          },
        ],
        "evidence": [
          {
            "channel": "digest",
            "chunkId": "c1",
            "endOffset": 40,
            "ordinal": 0,
            "score": 1,
            "sourceId": "s1",
            "startOffset": 0,
            "text": "Pine resin seals wounds on the trunk.",
          },
        ],
        "evidenceKind": "digest",
        "insufficient": false,
        "mode": "corpus",
      }
    `)
  })

  test("prefers digest over coverage for corpus mode", () => {
    const digestPack = buildDigestEvidencePack(
      [
        {
          sourceId: "s1",
          title: "Pine",
          digestText: "Resin seals wounds.",
          digestCitations: [{ chunkId: "c1", quote: "seals wounds" }],
        },
      ],
      [
        {
          chunkId: "c1",
          sourceId: "s1",
          text: "Pine resin seals wounds on the trunk.",
          startOffset: 0,
          endOffset: 40,
          ordinal: 0,
        },
      ],
    )

    const packed = packEvidence({
      mode: "corpus",
      sourceIds: ["s1"],
      sourceTitleById: new Map([["s1", "Pine"]]),
      digestPack,
      coverage: [
        {
          chunkId: "c2",
          sourceId: "s1",
          text: "Other chunk",
          score: 1,
          channel: "coverage",
          startOffset: 0,
          endOffset: 11,
          ordinal: 1,
        },
      ],
    })

    expect(packed.useDigestEvidence).toBe(true)
    expect(packed.evidenceKind).toBe("digest")
  })

  test("uses coverage when corpus mode has no digests", () => {
    const packed = packEvidence({
      mode: "corpus",
      sourceIds: ["s1"],
      sourceTitleById: new Map([["s1", "Pine"]]),
      digestPack: null,
      coverage: [
        {
          chunkId: "c1",
          sourceId: "s1",
          text: "Pine resin seals wounds on the trunk.",
          score: 1,
          channel: "coverage",
          startOffset: 0,
          endOffset: 40,
          ordinal: 0,
        },
      ],
    })

    expect(packed.evidenceKind).toBe("coverage")
    expect(packed.useDigestEvidence).toBe(false)
    expect(packed.mode).toBe("corpus")
  })
})
