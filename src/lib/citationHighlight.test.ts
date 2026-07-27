import { describe, expect, test } from "bun:test"
import { resolveCitationOffsets } from "./citationHighlight"

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
        "start": 30,
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
})
