import { describe, expect, test } from "bun:test"
import { formatChatError } from "./chatErrors"

describe("chat errors", () => {
  test("maps provider failures to readable copy", () => {
    expect(
      formatChatError("openai insufficient_quota billing"),
    ).toMatchInlineSnapshot(
      `"Chat is temporarily unavailable. Try again later."`,
    )
    expect(
      formatChatError(new Error("rate_limit exceeded")),
    ).toMatchInlineSnapshot(
      `"Too many requests right now. Try again in a moment."`,
    )
    expect(formatChatError("boom")).toMatchInlineSnapshot(`"boom"`)
  })
})
