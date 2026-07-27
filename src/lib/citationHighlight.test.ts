import { describe, expect, test } from "bun:test"
import { resolveCitationOffsets } from "./citationHighlight"
import { resolveCitationQuote } from "./citationQuote"

describe("citation highlight", () => {
  test("resolves citation offsets from locator or excerpt fallback", () => {
    const markdown = "Intro line\n\nExact passage about pine trees.\n\nOutro"

    expect(
      resolveCitationOffsets(markdown, { start: 12, end: 44 }),
    ).toMatchInlineSnapshot(`
      {
        "end": 44,
        "start": 12,
      }
    `)

    expect(
      resolveCitationOffsets(markdown, { start: 999, end: 1200 }, "pine trees"),
    ).toMatchInlineSnapshot(`
      {
        "end": 42,
        "start": 32,
      }
    `)

    expect(
      resolveCitationOffsets(markdown, null, "missing excerpt"),
    ).toMatchInlineSnapshot(`null`)
  })

  test("finds plain excerpt text inside markdown when locator is missing", () => {
    const markdown =
      "Intro\n\n**Wichtiger Hinweis:** Schulmanager Ende 31.07.2026.\n\nOutro"

    expect(
      resolveCitationOffsets(
        markdown,
        null,
        "Wichtiger Hinweis: Schulmanager Ende 31.07.2026.",
      ),
    ).toMatchInlineSnapshot(`
      {
        "end": 59,
        "start": 9,
      }
    `)
  })

  test("falls back to excerpt search when locator does not match excerpt", () => {
    const markdown =
      "Intro\n\nAb dem 31.07.2026 sind sämtliche dort gespeicherten Daten gelöscht.\n\nOutro"

    expect(
      resolveCitationOffsets(
        markdown,
        { start: 0, end: 5 },
        "sämtliche dort gespeicherten Daten gelöscht",
      ),
    ).toMatchInlineSnapshot(`
      {
        "end": 73,
        "start": 30,
      }
    `)
  })

  test("server quote locator and client highlight agree for the same quote", () => {
    const prefix = "Intro line\n\n"
    const chunkText = "**Wichtiger Hinweis:** Schulmanager Ende 31.07.2026."
    const suffix = "\n\nOutro"
    const markdown = `${prefix}${chunkText}${suffix}`
    const quote = "Wichtiger Hinweis: Schulmanager Ende 31.07.2026."

    const resolved = resolveCitationQuote({
      chunkText,
      startOffset: prefix.length,
      endOffset: prefix.length + chunkText.length,
      ordinal: 0,
      quote,
    })

    expect(resolved).not.toBeNull()

    if (!resolved) {
      return
    }

    const offsets = resolveCitationOffsets(
      markdown,
      {
        start: resolved.locator.startOffset,
        end: resolved.locator.endOffset,
      },
      resolved.excerpt,
    )

    expect(offsets).toMatchInlineSnapshot(`
      {
        "end": 64,
        "start": 14,
      }
    `)

    expect(offsets).toEqual({
      start: resolved.locator.startOffset,
      end: resolved.locator.endOffset,
    })

    expect(markdown.slice(offsets?.start, offsets?.end)).toBe(resolved.excerpt)
  })
})
