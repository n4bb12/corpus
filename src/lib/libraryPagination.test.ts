import { describe, expect, test } from "bun:test"
import {
  clampLibraryPage,
  libraryBrowseLimit,
  libraryBrowseOffset,
  libraryBrowsePageCount,
  librarySearchOffset,
  librarySearchPageCount,
} from "src/lib/libraryPagination"

describe("library pagination", () => {
  test("browse pages use a short first page then full pages", () => {
    expect(libraryBrowseLimit(1)).toMatchInlineSnapshot(`6`)
    expect(libraryBrowseLimit(2)).toMatchInlineSnapshot(`9`)
    expect(libraryBrowseOffset(1)).toMatchInlineSnapshot(`0`)
    expect(libraryBrowseOffset(2)).toMatchInlineSnapshot(`6`)
    expect(libraryBrowseOffset(3)).toMatchInlineSnapshot(`15`)
    expect(libraryBrowsePageCount(6)).toMatchInlineSnapshot(`1`)
    expect(libraryBrowsePageCount(7)).toMatchInlineSnapshot(`2`)
    expect(libraryBrowsePageCount(15)).toMatchInlineSnapshot(`2`)
    expect(libraryBrowsePageCount(16)).toMatchInlineSnapshot(`3`)
  })

  test("search pages are uniform", () => {
    expect(librarySearchOffset(1)).toMatchInlineSnapshot(`0`)
    expect(librarySearchOffset(2)).toMatchInlineSnapshot(`9`)
    expect(librarySearchPageCount(9)).toMatchInlineSnapshot(`1`)
    expect(librarySearchPageCount(10)).toMatchInlineSnapshot(`2`)
  })

  test("clamps page into range", () => {
    expect(clampLibraryPage(0, 3)).toMatchInlineSnapshot(`1`)
    expect(clampLibraryPage(9, 3)).toMatchInlineSnapshot(`3`)
    expect(clampLibraryPage(2, 0)).toMatchInlineSnapshot(`1`)
  })
})
