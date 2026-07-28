import { describe, expect, test } from "bun:test"
import {
  scrollTargetBlockStart,
  sourcePreviewBlocks,
} from "./sourcePreviewBlocks"

describe("sourcePreviewBlocks", () => {
  test("splits on blank lines and tracks offsets", () => {
    const content = "Alpha line\n\nBeta\nline\n\n\nGamma"

    expect(sourcePreviewBlocks(content)).toMatchInlineSnapshot(`
      [
        {
          "start": 0,
          "text": "Alpha line",
        },
        {
          "start": 12,
          "text": 
      "Beta
      line"
      ,
        },
        {
          "start": 24,
          "text": "Gamma",
        },
      ]
    `)
  })

  test("returns empty for blank content", () => {
    expect(sourcePreviewBlocks("")).toMatchInlineSnapshot(`[]`)
    expect(sourcePreviewBlocks("\n\n  \n")).toMatchInlineSnapshot(`[]`)
  })
})

describe("scrollTargetBlockStart", () => {
  test("prefers the block that contains the highlight start", () => {
    const blocks = sourcePreviewBlocks("one\n\ntwo words\n\nthree")

    expect(
      scrollTargetBlockStart(blocks, { start: 6, end: 9 }),
    ).toMatchInlineSnapshot(`5`)
  })

  test("falls back to an overlapping block", () => {
    const blocks = sourcePreviewBlocks("aaaa\n\nbbbb")

    expect(
      scrollTargetBlockStart(blocks, { start: 5, end: 8 }),
    ).toMatchInlineSnapshot(`6`)
  })
})
