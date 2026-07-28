import { describe, expect, test } from "bun:test"
import {
  compactTitle,
  fallbackTitleFromDigest,
  humanizeFilenameTitle,
  isVerbatimSourcePhrase,
  isWeakTitle,
  looksLikeDocumentCode,
  looksLikeFilename,
  looksLikeUrl,
  normalizeTitle,
  titleFromFilename,
  titleFromMarkdown,
  titleFromPastedText,
  titleFromSourceLabel,
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
      humanizeFilenameTitle("Elternbrief_Start_Infoportal.pdf"),
    ).toMatchInlineSnapshot(`"Elternbrief Start Infoportal"`)
    expect(
      titleFromSourceLabel("Elternbrief_Start_Infoportal.pdf"),
    ).toMatchInlineSnapshot(`"Elternbrief Start Infoportal"`)
    expect(
      titleFromMarkdown(
        "## Elternbrief\n\nElternbrief zum Start des Infoportals mit wichtigen Hinweisen. Mehr Text folgt.",
      ),
    ).toMatchInlineSnapshot(`"Elternbrief"`)
    expect(
      titleFromMarkdown(
        "Wichtiger Hinweis:\n\nIm Rahmen der kontinuierlichen Weiterentwicklung unserer schulischen Organisation.",
      ),
    ).toMatchInlineSnapshot(
      `"Im Rahmen der kontinuierlichen Weiterentwicklung unserer schulischen"`,
    )
    expect(
      compactTitle(
        "Im Rahmen der kontinuierlichen Weiterentwicklung unserer schulischen Organisation werden wir die Elt",
      ),
    ).toMatchInlineSnapshot(
      `"Im Rahmen der kontinuierlichen Weiterentwicklung unserer schulischen"`,
    )
    expect(isWeakTitle("Wichtiger Hinweis:")).toBe(true)
    expect(isWeakTitle("Untitled notebook")).toBe(true)
    expect(isWeakTitle("Elternbrief")).toBe(false)
    expect(looksLikeFilename("Elternbrief_Start_Infoportal.pdf")).toBe(true)
    expect(looksLikeFilename("Infoportal start letter")).toBe(false)
    expect(looksLikeUrl("https://biblebots.de/mission/")).toBe(true)
    expect(looksLikeUrl("biblebots.de/mission/")).toBe(true)
    expect(looksLikeUrl("Mission – Biblebots")).toBe(false)
    expect(looksLikeDocumentCode("32460 004")).toBe(true)
    expect(looksLikeDocumentCode("Elternbrief Start Infoportal")).toBe(false)
    expect(
      fallbackTitleFromDigest(
        "McLean (1989) describes seven new species of frogs from the region. Further notes follow.",
      ),
    ).toMatchInlineSnapshot(
      `"McLean (1989) describes seven new species of frogs from the region."`,
    )
  })

  test("rejects verbatim source phrases", () => {
    const markdown =
      "Liebe Eltern,\n\nMit freundlichen Grüßen\n\nDetails zum Infoportal folgen.\n\nIm Rahmen der kontinuierlichen Weiterentwicklung unserer schulischen Organisation werden wir die Eltern informieren."

    expect(isVerbatimSourcePhrase("Mit freundlichen Grüßen", markdown)).toBe(
      false,
    )
    expect(isVerbatimSourcePhrase("Liebe Eltern", markdown)).toBe(false)
    expect(isVerbatimSourcePhrase("Infoportal launch letter", markdown)).toBe(
      false,
    )
    expect(
      isVerbatimSourcePhrase(
        "Im Rahmen der kontinuierlichen Weiterentwicklung unserer schulischen Organisation werden wir die Eltern informieren",
        markdown,
      ),
    ).toBe(true)
  })
})
