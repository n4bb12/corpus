import { describe, expect, test } from "bun:test"
import {
  isConvexAuthTokenUsable,
  readJwtExpiryMs,
} from "src/lib/convexAuthToken"

function jwtWithExp(expSeconds: number) {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }))
  const payload = btoa(JSON.stringify({ exp: expSeconds }))

  return `${header}.${payload}.sig`
}

describe("convex auth token cache", () => {
  test("reads exp from jwt payload", () => {
    expect(readJwtExpiryMs(jwtWithExp(1_700_000_000))).toMatchInlineSnapshot(
      `1700000000000`,
    )
    expect(readJwtExpiryMs("not-a-jwt")).toMatchInlineSnapshot(`null`)
  })

  test("rejects expired or near-expiry tokens", () => {
    const now = 1_700_000_000_000

    expect(
      isConvexAuthTokenUsable(jwtWithExp(1_700_000_000 + 120), now),
    ).toMatchInlineSnapshot(`true`)

    expect(
      isConvexAuthTokenUsable(jwtWithExp(1_700_000_000 + 10), now),
    ).toMatchInlineSnapshot(`false`)

    expect(
      isConvexAuthTokenUsable(jwtWithExp(1_700_000_000 - 1), now),
    ).toMatchInlineSnapshot(`false`)
  })
})
