import { useConvexAuth } from "convex/react"
import { flushSync } from "react-dom"
import { clearConvexQueryCache } from "src/integrations/convex/provider"
import { authClient } from "src/lib/authClient"
import { useStore } from "zustand"
import { createStore } from "zustand/vanilla"

const signingOutStore = createStore<{ signingOut: boolean }>(() => ({
  signingOut: false,
}))

export function beginSignOut() {
  // Unmount signed-in query trees before Better Auth clears the Convex token.
  flushSync(() => {
    signingOutStore.setState({ signingOut: true })
  })

  // convex-helpers keeps idle subscriptions alive; drop them immediately.
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
