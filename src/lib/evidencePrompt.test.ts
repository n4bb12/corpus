import { describe, expect, test } from "bun:test"
import { formatCorpusEvidence, formatFlatEvidence } from "./evidencePrompt"

describe("evidence prompt formatting", () => {
  test("formats flat evidence with chunk and source ids", () => {
    expect(
      formatFlatEvidence([
        {
          chunkId: "c1",
          sourceId: "s1",
          text: "alpha",
        },
        {
          chunkId: "c2",
          sourceId: "s2",
          text: "beta",
        },
      ]),
    ).toMatchInlineSnapshot(`
      "[1] chunk:c1 source:s1
      alpha

      [2] chunk:c2 source:s2
      beta"
    `)
  })

  test("groups corpus evidence under source titles in selection order", () => {
    const titles = new Map([
      ["s2", "Biblebots"],
      ["s1", "Elternbrief"],
    ])

    expect(
      formatCorpusEvidence(
        [
          {
            chunkId: "c2",
            sourceId: "s2",
            text: "mission",
          },
          {
            chunkId: "c1",
            sourceId: "s1",
            text: "schule",
          },
        ],
        titles,
        ["s1", "s2"],
      ),
    ).toMatchInlineSnapshot(`
      "### Elternbrief
      sourceId:s1

      [1] chunk:c1
      schule

      ### Biblebots
      sourceId:s2

      [2] chunk:c2
      mission"
    `)
  })

  test("lists selected sources missing from the evidence pack", () => {
    expect(
      formatCorpusEvidence(
        [
          {
            chunkId: "c1",
            sourceId: "s1",
            text: "only",
          },
        ],
        new Map([
          ["s1", "One"],
          ["s2", "Two"],
        ]),
        ["s1", "s2"],
      ),
    ).toMatchInlineSnapshot(`
      "### One
      sourceId:s1

      [1] chunk:c1
      only

      ### Sources with no evidence in this pack
      - Two (sourceId:s2)"
    `)
  })
})
