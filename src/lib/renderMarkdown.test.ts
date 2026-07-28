import { describe, expect, test } from "bun:test"
import { renderMarkdownHtml } from "./renderMarkdown"

describe("renderMarkdownHtml", () => {
  test("keeps ordinary markdown formatting and https links", () => {
    const html = renderMarkdownHtml(
      "**bold** and [docs](https://example.com/a)",
    )

    expect(html).toContain("<strong>bold</strong>")
    expect(html).toContain('href="https://example.com/a"')
  })

  test("strips executable HTML and unsafe URL protocols", () => {
    expect(renderMarkdownHtml("<img src=x onerror=alert(1)>")).not.toContain(
      "onerror",
    )
    expect(renderMarkdownHtml("<svg onload=alert(1)></svg>")).not.toContain(
      "onload",
    )
    expect(renderMarkdownHtml("[click](javascript:alert(1))")).not.toContain(
      "javascript:",
    )
    expect(
      renderMarkdownHtml("![x](data:text/html,<script>alert(1)</script>)"),
    ).not.toContain("data:")
    expect(
      renderMarkdownHtml("<a href=javascript:alert(1)>x</a>"),
    ).not.toContain("javascript:")
  })
})
