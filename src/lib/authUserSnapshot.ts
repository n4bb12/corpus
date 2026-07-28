import { useStore } from "zustand"
import { createStore } from "zustand/vanilla"

/**
 * Sliding client optimism window for “still signed in” before Convex / Better Auth
 * settle. Refreshed whenever a live session is confirmed. Matches Better Auth
 * `session.expiresIn` (30 days).
 */
export const AUTH_USER_SNAPSHOT_TTL_MS = 60 * 60 * 24 * 30 * 1000

export const AUTH_USER_SNAPSHOT_STORAGE_KEY = "corpus-auth-user"

export type AuthUserSnapshot = {
  id: string
  name: string
  email: string
  expiresAt: number
}

type AuthUserSnapshotState = {
  snapshot: AuthUserSnapshot | null
}

export type AuthUserSnapshotInput = {
  id: string
  name: string
  email: string
}

function isAuthUserSnapshot(value: unknown): value is AuthUserSnapshot {
  if (!value || typeof value !== "object") {
    return false
  }

  const record = value as Record<string, unknown>

  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.email === "string" &&
    typeof record.expiresAt === "number"
  )
}

export function isAuthUserSnapshotValid(
  snapshot: AuthUserSnapshot | null,
  now = Date.now(),
) {
  return !!snapshot && snapshot.expiresAt > now
}

function readStoredSnapshot(): AuthUserSnapshot | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(AUTH_USER_SNAPSHOT_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)

    if (!isAuthUserSnapshot(parsed)) {
      window.localStorage.removeItem(AUTH_USER_SNAPSHOT_STORAGE_KEY)

      return null
    }

    if (!isAuthUserSnapshotValid(parsed)) {
      window.localStorage.removeItem(AUTH_USER_SNAPSHOT_STORAGE_KEY)

      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeStoredSnapshot(snapshot: AuthUserSnapshot | null) {
  if (typeof window === "undefined") {
    return
  }

  if (!snapshot) {
    window.localStorage.removeItem(AUTH_USER_SNAPSHOT_STORAGE_KEY)

    return
  }

  window.localStorage.setItem(
    AUTH_USER_SNAPSHOT_STORAGE_KEY,
    JSON.stringify(snapshot),
  )
}

const store = createStore<AuthUserSnapshotState>(() => ({
  snapshot: readStoredSnapshot(),
}))

export function getAuthUserSnapshot() {
  const { snapshot } = store.getState()

  if (isAuthUserSnapshotValid(snapshot)) {
    return snapshot
  }

  if (snapshot) {
    clearAuthUserSnapshot()
  }

  return null
}

export function setAuthUserSnapshot(user: AuthUserSnapshotInput) {
  const snapshot: AuthUserSnapshot = {
    id: user.id,
    name: user.name,
    email: user.email,
    expiresAt: Date.now() + AUTH_USER_SNAPSHOT_TTL_MS,
  }

  writeStoredSnapshot(snapshot)
  store.setState({ snapshot })
}

export function clearAuthUserSnapshot() {
  writeStoredSnapshot(null)
  store.setState({ snapshot: null })
}

export function useAuthUserSnapshot() {
  return useStore(store, (state) =>
    isAuthUserSnapshotValid(state.snapshot) ? state.snapshot : null,
  )
}
