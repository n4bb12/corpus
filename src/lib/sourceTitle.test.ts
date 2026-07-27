import { describe, expect, test } from "bun:test"
import {
  looksLikeFilename,
  normalizeTitle,
  titleFromFilename,
  titleFromMarkdown,
  titleFromPastedText,
  titleFromUrl,
} from "./sourceTitle"

describe("source titles", () => {
  test("normalizes and truncates", () => {
    expect(
      normalizeTitle("  Hello   world  ", "Fallback"),
    ).toMatchInlineSnapshot(`"Hello world"`)
    expect(normalizeTitle("a".repeat(120), "Fallback").length).toBe(100)
    expect(normalizeTitle("   ", "Fallback")).toMatchInlineSnapshot(
      `"Fallback"`,
    )
  })

  test("decodes html entities", () => {
    expect(
      normalizeTitle("Mission &#8211; Biblebots", "Fallback"),
    ).toMatchInlineSnapshot(`"Mission – Biblebots"`)
    expect(
      normalizeTitle("A &amp; B &ndash; C", "Fallback"),
    ).toMatchInlineSnapshot(`"A & B – C"`)
  })

  test("builds fallbacks", () => {
    expect(titleFromPastedText("Line one\nLine two")).toMatchInlineSnapshot(
      `"Line one"`,
    )
    expect(
      titleFromUrl("https://example.com/docs/guide"),
    ).toMatchInlineSnapshot(`"example.com/docs/guide"`)
    expect(titleFromFilename("notes.pdf")).toMatchInlineSnapshot(`"notes.pdf"`)
    expect(
      titleFromMarkdown(
        "## Elternbrief\n\nElternbrief zum Start des Infoportals mit wichtigen Hinweisen. Mehr Text folgt.",
      ),
    ).toMatchInlineSnapshot(
      `"Elternbrief zum Start des Infoportals mit wichtigen Hinweisen."`,
    )
    expect(looksLikeFilename("Elternbrief_Start_Infoportal.pdf")).toBe(true)
    expect(looksLikeFilename("Infoportal start letter")).toBe(false)
  })
})
