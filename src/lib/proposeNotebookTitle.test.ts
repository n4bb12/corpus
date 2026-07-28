import { describe, expect, test } from "bun:test"
import { proposeNotebookTitle } from "src/lib/proposeNotebookTitle"

describe("proposeNotebookTitle", () => {
  test("accepts a model title that covers every source", () => {
    expect(
      proposeNotebookTitle({
        sourceLabels: ["Pine resin", "Soil notes"],
        digests: ["Resin seals wounds.", "Soil holds water."],
        includedSourceIds: ["s1", "s2"],
        modelOutput: {
          title: "Forest materials",
          sourceIds: ["s1", "s2"],
        },
      }),
    ).toMatchInlineSnapshot(`
      {
        "kind": "title",
        "title": "Forest materials",
      }
    `)
  })

  test("falls back when the model title is weak", () => {
    expect(
      proposeNotebookTitle({
        sourceLabels: ["Pine resin", "Soil notes"],
        digests: [
          "Pine resin seals wounds on the trunk and protects the tree.",
          "Soil notes describe water retention in the upper layer.",
        ],
        includedSourceIds: ["s1", "s2"],
        modelOutput: {
          title: "Notes",
          sourceIds: ["s1"],
        },
      }).kind,
    ).toMatchInlineSnapshot(`"fallback"`)
  })
})
