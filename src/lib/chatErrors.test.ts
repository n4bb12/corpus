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

  test("strips Convex wrappers before mapping", () => {
    expect(
      formatChatError(
        new Error(
          "[CONVEX M(chat:startGeneration)] Server Error Uncaught Error: You've reached today's chat limit. Try again tomorrow. at handler (../src/convex/chat.ts:96:0) Called by client",
        ),
      ),
    ).toMatchInlineSnapshot(
      `"You've reached today's chat limit. Try again tomorrow."`,
    )
  })
})
