import { useConvexAuth } from "convex/react"
import { clearConvexQueryCache } from "src/integrations/convex/provider"
import { authClient } from "src/lib/authClient"
import { useStore } from "zustand"
import { createStore } from "zustand/vanilla"

const signingOutStore = createStore<{ signingOut: boolean }>(() => ({
  signingOut: false,
}))

export function beginSignOut() {
  // Skip authenticated queries; ClientAuthBoundary navigates to sign-in and
  // keeps that page mounted until the session is gone.
  signingOutStore.setState({ signingOut: true })
}

/**
 * Wait until React passive `useEffect` cleanups have run, then drop every
 * convex-helpers cache watch. Cache `useQuery` cleanups are passive, so clearing
 * immediately after `flushSync` races them — they can re-idle a subscription
 * after the first clear, and that watch re-runs unauthenticated on sign-out.
 */
export async function settleSignOutQueries() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      window.setTimeout(resolve, 0)
    })
  })

  clearConvexQueryCache()
}

export function endSignOut() {
  signingOutStore.setState({ signingOut: false })
}

export function useIsSigningOut() {
  return useStore(signingOutStore, (state) => state.signingOut)
}

/**
 * True only after Convex auth and the Better Auth session are both ready.
 * `useConvexAuth` can report authenticated from a cached JWT while the session
 * is still pending — queries in that window can resolve empty and then redo.
 */
export function useIsSignedIn() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const signingOut = useIsSigningOut()
  const session = authClient.useSession()

  return (
    !signingOut &&
    !isLoading &&
    !session.isPending &&
    isAuthenticated &&
    !!session.data?.session
  )
}

/** Pass query args only when Convex auth is ready; otherwise skip. */
export function useSignedInQueryArgs<T extends Record<string, unknown>>(
  args: T | "skip",
) {
  const isSignedIn = useIsSignedIn()

  if (!isSignedIn || args === "skip") {
    return "skip" as const
  }

  return args
}
