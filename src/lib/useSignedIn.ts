import { useConvexAuth } from "convex/react"
import {
  clearCachedConvexAuth,
  clearConvexQueryCache,
} from "src/components/context/ConvexProvider"
import { authClient } from "src/lib/authClient"
import {
  clearAuthUserSnapshot,
  isAuthUserSnapshotValid,
  useAuthUserSnapshot,
} from "src/lib/authUserSnapshot"
import { useStore } from "zustand"
import { createStore } from "zustand/vanilla"

const signingOutStore = createStore<{ signingOut: boolean }>(() => ({
  signingOut: false,
}))

export function beginSignOut() {
  // Skip authenticated queries; callers navigate to `/` until the session is gone.
  clearAuthUserSnapshot()
  clearCachedConvexAuth()
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
 * True when Convex auth + Better Auth session are ready, or when a still-valid
 * localStorage user snapshot says we were signed in (so queries can subscribe
 * immediately). Pair with a cached Convex JWT (`bootConvexAuthFromCache` /
 * `initialToken`) so `expectAuth` can resume before get-session finishes.
 */
export function useIsSignedIn() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const signingOut = useIsSigningOut()
  const session = authClient.useSession()
  const snapshot = useAuthUserSnapshot()

  if (signingOut) {
    return false
  }

  if (isAuthUserSnapshotValid(snapshot)) {
    return true
  }

  return (
    !isLoading &&
    !session.isPending &&
    isAuthenticated &&
    !!session.data?.session
  )
}

/** Pass query args only when signed in (live or snapshot); otherwise skip. */
export function useSignedInQueryArgs<T extends Record<string, unknown>>(
  args: T | "skip",
) {
  const isSignedIn = useIsSignedIn()

  if (!isSignedIn || args === "skip") {
    return "skip" as const
  }

  return args
}

/** Live session user, falling back to the localStorage snapshot. */
export function useAuthUser() {
  const session = authClient.useSession()
  const snapshot = useAuthUserSnapshot()
  const user = session.data?.user

  if (user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    }
  }

  if (snapshot) {
    return {
      id: snapshot.id,
      name: snapshot.name,
      email: snapshot.email,
    }
  }

  return null
}
