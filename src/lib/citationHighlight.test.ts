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
})
