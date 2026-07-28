import { describe, expect, test } from "bun:test"
import { ConvexError } from "convex/values"
import { formatUserError, stripConvexErrorWrapper } from "./userError"

describe("user errors", () => {
  test("prefers ConvexError data", () => {
    expect(
      formatUserError(
        new ConvexError(
          "You've reached today's limit for adding sources. Try again tomorrow.",
        ),
      ),
    ).toMatchInlineSnapshot(
      `"You've reached today's limit for adding sources. Try again tomorrow."`,
    )
  })

  test("reads ConvexError data when message is the hybrid stacktrace", () => {
    const error = new ConvexError(
      `[CONVEX M(sources:generateUploadUrl)] [Request ID: df6f7190f0ce8d04] Server Error Uncaught Error: You've reached today's limit for adding sources. Try again tomorrow. at assertIngestionQuota (../src/convex/sources.ts:65:0) at async handler (../src/convex/sources.ts:187:11)
  Called by client`,
    ) as ConvexError<string>

    error.data =
      "You've reached today's limit for adding sources. Try again tomorrow."

    expect(formatUserError(error)).toMatchInlineSnapshot(
      `"You've reached today's limit for adding sources. Try again tomorrow."`,
    )
  })

  test("strips Convex wrappers from plain Error messages", () => {
    const wrapped =
      "[CONVEX M(sources:generateUploadUrl)] [Request ID: df6f7190f0ce8d04] Server Error Uncaught Error: You've reached today's limit for adding sources. Try again tomorrow. at assertIngestionQuota (../src/convex/sources.ts:65:0) at async handler (../src/convex/sources.ts:187:11) Called by client"

    expect(stripConvexErrorWrapper(wrapped)).toMatchInlineSnapshot(
      `"You've reached today's limit for adding sources. Try again tomorrow."`,
    )
    expect(formatUserError(new Error(wrapped))).toMatchInlineSnapshot(
      `"You've reached today's limit for adding sources. Try again tomorrow."`,
    )
  })

  test("passes through plain messages and fallbacks", () => {
    expect(
      formatUserError(new Error("Notebook not found.")),
    ).toMatchInlineSnapshot(`"Notebook not found."`)
    expect(
      formatUserError({}, "Couldn't upload that file."),
    ).toMatchInlineSnapshot(`"Couldn't upload that file."`)
    expect(
      formatUserError(
        new Error("[CONVEX M(sources:generateUploadUrl)] Server Error"),
        "Couldn't upload that file.",
      ),
    ).toMatchInlineSnapshot(`"Couldn't upload that file."`)
  })
})
