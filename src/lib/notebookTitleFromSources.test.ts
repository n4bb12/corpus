import { describe, expect, test } from "bun:test"
import {
  preferredSourceLabel,
  type TitleGenerator,
  titleFromSourceSnapshots,
} from "src/lib/notebookTitleFromSources"

function fakeTitleGenerator(title: string | null): TitleGenerator {
  return {
    generateOnce() {
      return Promise.resolve(title ? { title } : null)
    },
  }
}

describe("notebookTitleFromSources", () => {
  test("prefers a usable display label over a weak original", () => {
    expect(
      preferredSourceLabel({
        title: "Pine resin sealing",
        originalTitle: "notes.pdf",
      }),
    ).toMatchInlineSnapshot(`"Pine resin sealing"`)
  })

  test("proposes from snapshots through the generation port", async () => {
    const result = await titleFromSourceSnapshots({
      sources: [
        {
          sourceId: "s1",
          title: "Pine resin",
          originalTitle: "pine.pdf",
          text: "Pine resin seals wounds on the trunk and protects the tree.",
        },
        {
          sourceId: "s2",
          title: "Soil notes",
          originalTitle: "soil.md",
          text: "Soil holds water in the upper layer after rain.",
        },
      ],
      generateTitle: fakeTitleGenerator("Forest materials"),
    })

    expect(result).toMatchInlineSnapshot(`
      {
        "includedSourceIds": [
          "s1",
          "s2",
        ],
        "proposal": {
          "kind": "title",
          "title": "Forest materials",
        },
      }
    `)
  })

  test("falls back when the generation port returns nothing", async () => {
    const result = await titleFromSourceSnapshots({
      sources: [
        {
          sourceId: "s1",
          title: "Pine resin",
          originalTitle: "pine.pdf",
          text: "Pine resin seals wounds on the trunk and protects the tree.",
        },
        {
          sourceId: "s2",
          title: "Soil notes",
          originalTitle: "soil.md",
          text: "Soil notes describe water retention in the upper layer.",
        },
      ],
      generateTitle: fakeTitleGenerator(null),
    })

    expect(result.proposal.kind).toMatchInlineSnapshot(`"fallback"`)
    expect(result.includedSourceIds).toMatchInlineSnapshot(`
      [
        "s1",
        "s2",
      ]
    `)
  })
})
