/**
 * Cached Convex JWT for cold-load `expectAuth` / `initialToken`.
 * Without this, a user snapshot alone only lifts the React `"skip"` gate —
 * the WebSocket stays paused until Better Auth finishes get-session + token.
 */

export const CONVEX_AUTH_TOKEN_STORAGE_KEY = "corpus-convex-token"

/** Reject tokens this close to exp so Convex is not handed an already-stale JWT. */
const TOKEN_EXPIRY_SKEW_MS = 30_000

export function readJwtExpiryMs(token: string) {
  const payload = token.split(".")[1]

  if (!payload) {
    return null
  }

  try {
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/")
    const padLength = (4 - (normalized.length % 4)) % 4
    const padded = normalized + "=".repeat(padLength)
    const json: unknown = JSON.parse(atob(padded))

    if (!json || typeof json !== "object") {
      return null
    }

    const exp = (json as { exp?: unknown }).exp

    if (typeof exp !== "number") {
      return null
    }

    return exp * 1000
  } catch {
    return null
  }
}

export function isConvexAuthTokenUsable(token: string, now = Date.now()) {
  const expiresAt = readJwtExpiryMs(token)

  if (expiresAt === null) {
    return false
  }

  return expiresAt - TOKEN_EXPIRY_SKEW_MS > now
}

export function getStoredConvexAuthToken() {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const token = window.localStorage.getItem(CONVEX_AUTH_TOKEN_STORAGE_KEY)

    if (!token || !isConvexAuthTokenUsable(token)) {
      if (token) {
        window.localStorage.removeItem(CONVEX_AUTH_TOKEN_STORAGE_KEY)
      }

      return null
    }

    return token
  } catch {
    return null
  }
}

export function setStoredConvexAuthToken(token: string) {
  if (typeof window === "undefined") {
    return
  }

  if (!isConvexAuthTokenUsable(token)) {
    clearStoredConvexAuthToken()

    return
  }

  try {
    window.localStorage.setItem(CONVEX_AUTH_TOKEN_STORAGE_KEY, token)
  } catch {
    // Quota / private mode — cold load just waits for a live token.
  }
}

export function clearStoredConvexAuthToken() {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.removeItem(CONVEX_AUTH_TOKEN_STORAGE_KEY)
  } catch {
    // ignore
  }
}
