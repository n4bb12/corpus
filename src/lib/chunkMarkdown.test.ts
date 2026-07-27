import { describe, expect, test } from "bun:test"
import { chunkMarkdown } from "./chunkMarkdown"

describe("chunkMarkdown", () => {
  test("packs adjacent short paragraphs under maxChunkSize", () => {
    const markdown = "Alpha paragraph.\n\nBeta paragraph.\n\nGamma paragraph."

    expect(
      chunkMarkdown(markdown, { maxChunkSize: 40, minChunkSize: 1 }),
    ).toMatchInlineSnapshot(`
      [
        
      "Alpha paragraph.

      Beta paragraph."
      ,
        "Gamma paragraph.",
      ]
    `)
  })

  test("keeps a heading with the following paragraph until maxChunkSize", () => {
    const markdown =
      "# Title\n\nShort body under the title.\n\n## Next\n\nOther."

    expect(
      chunkMarkdown(markdown, { maxChunkSize: 40, minChunkSize: 1 }),
    ).toMatchInlineSnapshot(`
      [
        
      "# Title

      Short body under the title."
      ,
        
      "## Next

      Other."
      ,
      ]
    `)
  })

  test("keeps a fenced code block as one segment when under maxChunkSize", () => {
    const markdown =
      "Intro text here.\n\n```ts\nconst x = 1\n```\n\nOutro after code."

    expect(
      chunkMarkdown(markdown, { maxChunkSize: 80, minChunkSize: 1 }),
    ).toMatchInlineSnapshot(`
      [
        
      "Intro text here.

      \`\`\`ts
      const x = 1
      \`\`\`

      Outro after code."
      ,
      ]
    `)
  })

  test("hard-splits a segment longer than maxChunkSize", () => {
    const markdown = "abcdefghij"

    expect(
      chunkMarkdown(markdown, { maxChunkSize: 4, minChunkSize: 1 }),
    ).toMatchInlineSnapshot(`
      [
        "abcd",
        "efgh",
        "ij",
      ]
    `)
  })

  test("merges a trailing undersized chunk into the previous chunk", () => {
    // 29 chars + "Tiny." (5) cannot pack under max 30, so minChunkSize merges.
    const markdown = "Long enough first paragraph!!\n\nTiny."

    expect(
      chunkMarkdown(markdown, { maxChunkSize: 30, minChunkSize: 10 }),
    ).toMatchInlineSnapshot(`
      [
        
      "Long enough first paragraph!!

      Tiny."
      ,
      ]
    `)
  })
})
