import { describe, expect, test } from "bun:test"
import {
  fallbackNotebookTitle,
  isLowQualityNotebookTitle,
  isSingleSourceNotebookTitle,
  isUsableNotebookTitle,
  multiSourceFallbackTitle,
} from "./notebookTitleQuality"

describe("notebook title quality", () => {
  test("rejects vague or truncated titles", () => {
    expect(isLowQualityNotebookTitle("The excerpt from J.")).toBe(true)
    expect(isLowQualityNotebookTitle("Excerpt from McLean")).toBe(true)
    expect(isLowQualityNotebookTitle("Notes")).toBe(true)
    expect(isLowQualityNotebookTitle("Untitled notebook")).toBe(true)
    expect(isLowQualityNotebookTitle("32460 004")).toBe(true)
    expect(isUsableNotebookTitle("Reef frog taxonomy")).toBe(true)
    expect(isUsableNotebookTitle("Mission – Biblebots")).toBe(true)
  })

  test("flags titles that only repeat one source in a multi-source set", () => {
    expect(
      isSingleSourceNotebookTitle("Elternbrief Start Infoportal", [
        "Mission – Biblebots",
        "Elternbrief Start Infoportal",
      ]),
    ).toBe(true)

    expect(
      isSingleSourceNotebookTitle("Biblebots & school portal", [
        "Mission – Biblebots",
        "Elternbrief Start Infoportal",
      ]),
    ).toBe(false)

    expect(
      isSingleSourceNotebookTitle("Elternbrief Start Infoportal", [
        "Elternbrief Start Infoportal",
      ]),
    ).toBe(false)
  })

  test("joins distinct source labels for multi-source fallback", () => {
    expect(
      multiSourceFallbackTitle([
        "Mission – Biblebots",
        "Elternbrief Start Infoportal",
      ]),
    ).toMatchInlineSnapshot(
      `"Mission – Biblebots & Elternbrief Start Infoportal"`,
    )

    expect(
      multiSourceFallbackTitle(["32460 004", "32460 003"]),
    ).toMatchInlineSnapshot(`""`)

    expect(multiSourceFallbackTitle(["Reef frogs"])).toMatchInlineSnapshot(
      `"Reef frogs"`,
    )
  })

  test("does not leave ready studies untitled when their filenames are codes", () => {
    expect(
      fallbackNotebookTitle({
        sourceLabels: ["32460 001", "32460 002", "32460 003", "32460 004"],
        digests: [
          "McLean (1989) describes seven new frog species from mountain forests.",
          "The second study examines habitat and distribution across the region.",
          "A taxonomic revision compares diagnostic features among related frogs.",
          "The final paper documents conservation threats to the study species.",
        ],
      }),
    ).toMatchInlineSnapshot(`"Frog Species Studies"`)
  })
})
