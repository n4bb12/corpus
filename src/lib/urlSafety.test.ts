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
    expect(validatePublicHttpUrl("http://localhost/admin").ok).toBe(false)
    expect(isBlockedResolvedAddress("10.0.0.8")).toBe(true)
  })

  test("rejects loopback-equivalent and special-use addresses", () => {
    expect(validatePublicHttpUrl("http://[::ffff:127.0.0.1]/").ok).toBe(false)
    expect(validatePublicHttpUrl("http://[::]/").ok).toBe(false)
    expect(validatePublicHttpUrl("http://100.64.0.1/").ok).toBe(false)
    expect(validatePublicHttpUrl("http://[::1]/").ok).toBe(false)
    expect(validatePublicHttpUrl("http://0.0.0.0/").ok).toBe(false)
    expect(isBlockedResolvedAddress("::ffff:127.0.0.1")).toBe(true)
    expect(isBlockedResolvedAddress("100.64.0.1")).toBe(true)
    expect(isBlockedResolvedAddress("2001:db8::1")).toBe(true)
  })

  test("allows public IPv4-mapped addresses after classification", () => {
    expect(isBlockedResolvedAddress("::ffff:8.8.8.8")).toBe(false)
    expect(isBlockedResolvedAddress("8.8.8.8")).toBe(false)
  })
})
