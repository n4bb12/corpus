import { describe, expect, test } from "bun:test"
import { describeRejectedFile, isAcceptedUpload } from "./fileTypes"

describe("file types", () => {
  test("accepts supported uploads", () => {
    expect(isAcceptedUpload("paper.pdf", "application/pdf")).toBe(true)
    expect(isAcceptedUpload("notes.md", "text/markdown")).toBe(true)
    expect(isAcceptedUpload("slide.pptx")).toBe(false)
    expect(describeRejectedFile("photo.png")).toContain("unsupported")
  })
})
