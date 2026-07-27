import { describe, expect, test } from "bun:test"
import { isBlockedResolvedAddress, validatePublicHttpUrl } from "./urlSafety"

describe("url safety", () => {
  test("accepts public https urls", () => {
    expect(validatePublicHttpUrl("https://example.com/a").ok).toBe(true)
  })

  test("rejects credentials and private hosts", () => {
    expect(validatePublicHttpUrl("https://user:pass@example.com").ok).toBe(
      false,
    )
    expect(validatePublicHttpUrl("http://127.0.0.1/secret").ok).toBe(false)
    expect(validatePublicHttpUrl("http://169.254.169.254/latest").ok).toBe(
      false,
    )
    expect(isBlockedResolvedAddress("10.0.0.8")).toBe(true)
  })
})
