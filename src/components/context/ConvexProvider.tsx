"use client"

import {
  type AuthClient,
  ConvexBetterAuthProvider,
} from "@convex-dev/better-auth/react"
import { ConvexReactClient } from "convex/react"
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache"
import { ConvexQueryCacheContext } from "convex-helpers/react/cache/provider"
import {
  type ContextType,
  type ReactNode,
  useContext,
  useLayoutEffect,
} from "react"
import { authClient } from "src/lib/authClient"
import { getAuthUserSnapshot } from "src/lib/authUserSnapshot"
import {
  clearStoredConvexAuthToken,
  getStoredConvexAuthToken,
  setStoredConvexAuthToken,
} from "src/lib/convexAuthToken"
import { requirePublicEnv } from "src/lib/env"

const convexUrl = requirePublicEnv("CONVEX_URL")

export const convexClient = new ConvexReactClient(convexUrl, {
  // Pause queries/mutations until Better Auth has handed Convex a validated token.
  expectAuth: true,
})

/**
 * Resume `expectAuth` before React auth settles. A user snapshot alone only
 * lifts `"skip"` — without a token fetcher here, the socket stays paused through
 * get-session. Boot when a cached JWT or user snapshot exists, and honor
 * Convex's post-authenticate `forceRefreshToken` via the cookie-backed endpoint.
 *
 * `ConvexBetterAuthProvider` replaces this fetcher once a live session exists.
 */
function bootConvexAuthFromCache() {
  const cached = getStoredConvexAuthToken()
  const hasUserSnapshot = !!getAuthUserSnapshot()

  if (!cached && !hasUserSnapshot) {
    return
  }

  convexClient.setAuth(
    async ({ forceRefreshToken }) => {
      if (!forceRefreshToken) {
        const existing = getStoredConvexAuthToken()

        if (existing) {
          return existing
        }
      }

      try {
        const { data } = await authClient.convex.token({
          fetchOptions: { throw: false },
        })

        if (data?.token) {
          setStoredConvexAuthToken(data.token)

          return data.token
        }
      } catch {
        // Fall through to cached JWT if the cookie refresh fails briefly.
      }

      return getStoredConvexAuthToken()
    },
    () => {},
  )
}

bootConvexAuthFromCache()

type QueryCacheRegistry = NonNullable<
  ContextType<typeof ConvexQueryCacheContext>["registry"]
>

let queryCacheRegistry: QueryCacheRegistry | null = null

/** Drop every idle/active entry in the convex-helpers query cache. */
export function clearConvexQueryCache() {
  const registry = queryCacheRegistry

  if (!registry) {
    return
  }

  for (const entry of registry.queries.values()) {
    if (entry.evictTimer !== null) {
      window.clearTimeout(entry.evictTimer)
    }

    entry.unsub()
  }

  registry.queries.clear()
  registry.subs.clear()
  registry.idle = 0
}

function ConvexQueryCacheRegistryBridge() {
  const { registry } = useContext(ConvexQueryCacheContext)

  useLayoutEffect(() => {
    queryCacheRegistry = registry

    return () => {
      if (queryCacheRegistry === registry) {
        queryCacheRegistry = null
      }
    }
  }, [registry])

  return null
}

export type ConvexProviderProps = {
  children: ReactNode
}

export function ConvexProvider({ children }: ConvexProviderProps) {
  // Client-only read: SSR has no localStorage. Hydration may keep Better Auth's
  // internal `cachedToken` null; `bootConvexAuthFromCache` still unpauses the
  // socket. `initialToken` helps client-only mounts and soft navigations.
  const initialToken =
    typeof window === "undefined" ? null : getStoredConvexAuthToken()

  return (
    <ConvexBetterAuthProvider
      client={convexClient}
      authClient={authClient as unknown as AuthClient}
      initialToken={initialToken}
    >
      <ConvexQueryCacheProvider maxIdleEntries={0}>
        <ConvexQueryCacheRegistryBridge />
        {children}
      </ConvexQueryCacheProvider>
    </ConvexBetterAuthProvider>
  )
}

/** Persist a freshly issued Convex JWT for the next cold load. */
export function cacheConvexAuthToken(token: string) {
  setStoredConvexAuthToken(token)
}

export function clearCachedConvexAuth() {
  clearStoredConvexAuthToken()
  convexClient.clearAuth()
}
