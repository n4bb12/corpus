import { describe, expect, test } from "bun:test"
import { remainingQuota, utcDateKey } from "./quotas"

describe("quotas", () => {
  test("computes remaining usage", () => {
    expect(remainingQuota(3, 10)).toMatchInlineSnapshot(`7`)
    expect(
      utcDateKey(new Date("2026-07-25T12:00:00.000Z")),
    ).toMatchInlineSnapshot(`"2026-07-25"`)
  })
})
