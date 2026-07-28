"use client"

import { useConvexAuth } from "convex/react"
import { useRouter } from "next/navigation"
import { type ReactNode, useEffect, useLayoutEffect } from "react"
import { SignInPage } from "src/components/pages/SignInPage"
import { authClient } from "src/lib/authClient"
import { endSignOut, useIsSigningOut } from "src/lib/useSignedIn"
import { useSyncAuthUserSnapshot } from "src/lib/useSyncAuthUserSnapshot"

export type ClientAuthBoundaryProps = {
  children: ReactNode
  mode: "signed-in" | "signed-out"
}

/** Paint sign-in immediately — avoid an empty flash during the redirect. */
function RedirectToSignIn() {
  const router = useRouter()

  useLayoutEffect(() => {
    router.replace("/")
  }, [router])

  return <SignInPage />
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
  // signed-in pages between the sign-out click and a settled sign-in route.
  useEffect(() => {
    if (!signingOut || session.isPending || hasSession) {
      return
    }

    endSignOut()
  }, [signingOut, session.isPending, hasSession])

  // While signing out: show sign-in immediately and keep it mounted. Never
  // an empty shell or the library chrome (header, no data).
  if (signingOut) {
    if (mode === "signed-out") {
      return children
    }

    return <RedirectToSignIn />
  }

  const authReady = !isLoading && !session.isPending
  const isSignedIn = isAuthenticated && hasSession

  // Session is gone — redirect signed-in routes immediately. Do not fall through
  // to `children` while Convex auth is still settling (that remounts library /
  // notebook queries and races the cleared token).
  if (mode === "signed-in" && !session.isPending && !hasSession) {
    return <RedirectToSignIn />
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
