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
import { requireViteEnv } from "src/lib/env"

const convexUrl = requireViteEnv("VITE_CONVEX_URL")

export const convexClient = new ConvexReactClient(convexUrl, {
  // Pause queries/mutations until Better Auth has handed Convex a validated token.
  expectAuth: true,
})

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

export type AppConvexProviderProps = {
  children: ReactNode
}

export function AppConvexProvider({ children }: AppConvexProviderProps) {
  return (
    <ConvexBetterAuthProvider
      client={convexClient}
      authClient={authClient as unknown as AuthClient}
    >
      <ConvexQueryCacheProvider>
        <ConvexQueryCacheRegistryBridge />
        {children}
      </ConvexQueryCacheProvider>
    </ConvexBetterAuthProvider>
  )
}
