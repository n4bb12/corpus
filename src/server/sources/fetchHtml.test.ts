import { describe, expect, test } from "bun:test"
import { createPinnedLookup, extractReadableHtml } from "./fetchHtml"

describe("createPinnedLookup", () => {
  test("returns an address list when options.all is true", () => {
    const lookup = createPinnedLookup("93.184.216.34", 4)
    let received: unknown

    lookup("example.com", { all: true }, (_err, result) => {
      received = result
    })

    expect(received).toMatchInlineSnapshot(`
      [
        {
          "address": "93.184.216.34",
          "family": 4,
        },
      ]
    `)
  })

  test("returns a single address when options.all is false", () => {
    const lookup = createPinnedLookup("93.184.216.34", 4)
    let address: unknown
    let family: unknown

    lookup("example.com", { all: false }, (_err, result, nextFamily) => {
      address = result
      family = nextFamily
    })

    expect(address).toBe("93.184.216.34")
    expect(family).toBe(4)
  })
})

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
