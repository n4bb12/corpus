import { useConvexAuth } from "convex/react"
import { useEffect } from "react"
import {
  cacheConvexAuthToken,
  clearCachedConvexAuth,
} from "src/components/context/ConvexProvider"
import { authClient } from "src/lib/authClient"
import {
  clearAuthUserSnapshot,
  setAuthUserSnapshot,
  useAuthUserSnapshot,
} from "src/lib/authUserSnapshot"
import {
  beginSignOut,
  endSignOut,
  settleSignOutQueries,
  useIsSigningOut,
} from "src/lib/useSignedIn"

/**
 * Keep the localStorage user snapshot + Convex JWT aligned with Better Auth,
 * and sign out when the snapshot TTL elapses while the app is open.
 *
 * Mount once under the auth boundary (not from every `useIsSignedIn` caller).
 */
export function useSyncAuthUserSnapshot() {
  const { isLoading } = useConvexAuth()
  const session = authClient.useSession()
  const signingOut = useIsSigningOut()
  const snapshot = useAuthUserSnapshot()

  useEffect(() => {
    if (signingOut || isLoading || session.isPending) {
      return
    }

    const user = session.data?.user

    if (session.data?.session && user) {
      setAuthUserSnapshot({
        id: user.id,
        name: user.name,
        email: user.email,
      })

      void authClient.convex
        .token({ fetchOptions: { throw: false } })
        .then(({ data }) => {
          if (data?.token) {
            cacheConvexAuthToken(data.token)
          }
        })

      return
    }

    // Auth settled without a session — drop optimism so queries skip, and
    // clear any bootstrapped JWT so expectAuth does not stay authenticated.
    clearAuthUserSnapshot()
    clearCachedConvexAuth()
  }, [
    signingOut,
    isLoading,
    session.isPending,
    session.data?.session,
    session.data?.user?.id,
    session.data?.user?.name,
    session.data?.user?.email,
    session.data?.user,
  ])

  useEffect(() => {
    if (signingOut || !snapshot) {
      return
    }

    const expiresAt = snapshot.expiresAt
    let timer = 0

    function scheduleExpiryCheck() {
      const remainingMs = expiresAt - Date.now()

      if (remainingMs <= 0) {
        void expireAuthUserSnapshot()

        return
      }

      // `setTimeout` delays are 32-bit; wake at least daily to re-check.
      const delay = Math.min(remainingMs, 60 * 60 * 24 * 1000)

      timer = window.setTimeout(scheduleExpiryCheck, delay)
    }

    scheduleExpiryCheck()

    return () => {
      window.clearTimeout(timer)
    }
  }, [signingOut, snapshot])
}

async function expireAuthUserSnapshot() {
  beginSignOut()
  await settleSignOutQueries()

  await authClient.signOut({
    fetchOptions: {
      onError: () => {
        endSignOut()
      },
    },
  })
}
