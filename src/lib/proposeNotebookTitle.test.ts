import { describe, expect, test } from "bun:test"
import { proposeNotebookTitle } from "src/lib/proposeNotebookTitle"

describe("proposeNotebookTitle", () => {
  test("accepts a usable model title", () => {
    expect(
      proposeNotebookTitle({
        sourceLabels: ["Pine resin", "Soil notes"],
        digests: ["Resin seals wounds.", "Soil holds water."],
        modelOutput: {
          title: "Forest materials",
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
        modelOutput: {
          title: "Notes",
        },
      }).kind,
    ).toMatchInlineSnapshot(`"fallback"`)
  })

  test("does not join clipped source-title fragments", () => {
    expect(
      proposeNotebookTitle({
        sourceLabels: [
          "elvent — Deine Marke für",
          "Deine Deko-Box. | Flowers &",
        ],
        digests: [
          "Outdoor-Produkte unterstützen Familien bei gemeinsamen Ausflügen.",
          "Dekorationen und Deko-Boxen werden individuell selbst gefertigt.",
        ],
        modelOutput: null,
      }),
    ).toMatchInlineSnapshot(`
      {
        "kind": "fallback",
        "title": "Research Collection",
      }
    `)
  })
})
