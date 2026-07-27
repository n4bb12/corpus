import { describe, expect, test } from "bun:test"
import { extractReadableHtml } from "./fetchHtml"

describe("extractReadableHtml", () => {
  test("prefers main and keeps every product article inside it", async () => {
    const html = `<!doctype html>
<html>
  <head><title>Shop</title></head>
  <body>
    <nav>Menu</nav>
    <main>
      <h2>Recommendations</h2>
      <article><h3>Product A</h3><p>First item</p></article>
      <article><h3>Product B</h3><p>Second item</p></article>
      <article><h3>Product C</h3><p>Third item</p></article>
    </main>
    <footer>Footer</footer>
  </body>
</html>`

    const readable = await extractReadableHtml(html)

    expect(readable.title).toBe("Shop")
    expect(readable.html).toContain("Product A")
    expect(readable.html).toContain("Product B")
    expect(readable.html).toContain("Product C")
    expect(readable.html).not.toContain("Menu")
    expect(readable.html).not.toContain("Footer")
  })

  test("does not narrow to a lone article when there is no main", async () => {
    const html = `<!doctype html>
<html>
  <body>
    <nav>Keep nav text</nav>
    <article><h1>Featured product</h1><p>Only this used to survive</p></article>
    <section><h2>Why us</h2><p>Landing copy outside the article</p></section>
    <footer>Keep footer text</footer>
  </body>
</html>`

    const readable = await extractReadableHtml(html)

    expect(readable.html).toContain("Featured product")
    expect(readable.html).toContain("Landing copy outside the article")
    expect(readable.html).toContain("Keep nav text")
    expect(readable.html).toContain("Keep footer text")
  })
})
