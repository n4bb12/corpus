import { describe, expect, test } from "bun:test"
import { notebookMatchesSearch } from "src/lib/notebookSearch"

describe("notebook search", () => {
  test("matches substrings inside title words", () => {
    expect(
      notebookMatchesSearch("Elternbrief Start Infoportal", "portal"),
    ).toMatchInlineSnapshot(`true`)
    expect(
      notebookMatchesSearch("Elternbrief Start Infoportal", "eltern"),
    ).toMatchInlineSnapshot(`true`)
    expect(
      notebookMatchesSearch("Elternbrief Start Infoportal", "xyz"),
    ).toMatchInlineSnapshot(`false`)
  })

  test("matches untitled display titles", () => {
    expect(notebookMatchesSearch("", "untitled")).toMatchInlineSnapshot(`true`)
    expect(notebookMatchesSearch("", "note")).toMatchInlineSnapshot(`true`)
    expect(notebookMatchesSearch("", "portal")).toMatchInlineSnapshot(`false`)
  })
})
