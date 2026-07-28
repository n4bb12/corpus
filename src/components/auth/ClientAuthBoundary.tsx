"use client"

import { useConvexAuth } from "convex/react"
import { useRouter } from "next/navigation"
import { type ReactNode, useEffect, useLayoutEffect } from "react"
import { authClient } from "src/lib/authClient"
import { endSignOut, useIsSigningOut } from "src/lib/useSignedIn"
import { useSyncAuthUserSnapshot } from "src/lib/useSyncAuthUserSnapshot"

export type ClientAuthBoundaryProps = {
  children: ReactNode
  mode: "signed-in" | "signed-out"
}

/** Match `/` while the redirect settles — SignInPage only mounts on `/sign-in`. */
function RedirectHome() {
  const router = useRouter()

  useLayoutEffect(() => {
    router.replace("/")
  }, [router])

  return <div className="atmosphere h-dvh overflow-hidden" aria-hidden />
}

export function ClientAuthBoundary({
  children,
  mode,
}: ClientAuthBoundaryProps) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const session = authClient.useSession()
  const signingOut = useIsSigningOut()
  const hasSession = !!session.data?.session

  useSyncAuthUserSnapshot()

  // Drop the flag only after the session is actually gone so we never remount
  // signed-in pages between the sign-out click and a settled home redirect.
  useEffect(() => {
    if (!signingOut || session.isPending || hasSession) {
      return
    }

    endSignOut()
  }, [signingOut, session.isPending, hasSession])

  // While signing out: leave signed-in chrome immediately. `/` then sends
  // unsigned users to `/sign-in` (where SignInPage mounts once).
  if (signingOut) {
    if (mode === "signed-out") {
      return children
    }

    return <RedirectHome />
  }

  const authReady = !isLoading && !session.isPending
  const isSignedIn = isAuthenticated && hasSession

  // Session is gone — redirect signed-in routes immediately. Do not fall through
  // to `children` while Convex auth is still settling (that remounts library /
  // notebook queries and races the cleared token).
  if (mode === "signed-in" && !session.isPending && !hasSession) {
    return <RedirectHome />
  }

  // Never block first paint on auth. Pages render immediately; queries enable
  // from a valid localStorage user snapshot (or once the live session is ready).
  if (!authReady) {
    return children
  }

  if (mode === "signed-out" && isSignedIn) {
    return <NavigateLibrary />
  }

  return children
}

function NavigateLibrary() {
  const router = useRouter()

  useLayoutEffect(() => {
    router.replace("/library")
  }, [router])

  return null
}
