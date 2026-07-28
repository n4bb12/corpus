import { describe, expect, test } from "bun:test"
import {
  AUTH_USER_SNAPSHOT_TTL_MS,
  type AuthUserSnapshot,
  isAuthUserSnapshotValid,
} from "src/lib/authUserSnapshot"

describe("auth user snapshot", () => {
  test("valid when expiresAt is in the future", () => {
    const snapshot = {
      id: "user_1",
      name: "Ada",
      email: "ada@example.com",
      expiresAt: 1_000,
    } satisfies AuthUserSnapshot

    expect(isAuthUserSnapshotValid(snapshot, 999)).toMatchInlineSnapshot(`true`)
    expect(isAuthUserSnapshotValid(snapshot, 1_000)).toMatchInlineSnapshot(
      `false`,
    )
    expect(isAuthUserSnapshotValid(null, 0)).toMatchInlineSnapshot(`false`)
  })

  test("ttl is four hours", () => {
    expect(AUTH_USER_SNAPSHOT_TTL_MS).toMatchInlineSnapshot(`14400000`)
  })
})
