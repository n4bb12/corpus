import { describe, expect, test } from "bun:test"
import { cleanPdfText, isUsefulPdfText } from "./pdfText"

describe("pdf text helpers", () => {
  test("rejects page-marker-only extraction", () => {
    expect(cleanPdfText("\n\n-- 1 of 1 --\n\n")).toMatchInlineSnapshot(`""`)
    expect(isUsefulPdfText("\n\n-- 1 of 1 --\n\n")).toBe(false)
    expect(
      isUsefulPdfText(
        "Elternbrief zum Start des Infoportals mit wichtigen Hinweisen.",
      ),
    ).toBe(true)
  })
})
