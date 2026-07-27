import { describe, expect, test } from "bun:test"
import { markdownToPlainText } from "./markdownPlain"

describe("markdown plain text", () => {
  test("strips common markdown for citation excerpts", () => {
    expect(
      markdownToPlainText(
        "## Heading\n\nA **bold** claim with a [link](https://example.com) and `code`.",
      ),
    ).toMatchInlineSnapshot(`"Heading A bold claim with a link and code."`)
  })
})
