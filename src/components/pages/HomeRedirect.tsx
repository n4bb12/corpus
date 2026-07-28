"use client"

import { useConvexAuth } from "convex/react"
import { useRouter } from "next/navigation"
import { useLayoutEffect } from "react"
import { authClient } from "src/lib/authClient"
import { useIsSigningOut } from "src/lib/useSignedIn"

export function HomeRedirect() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const session = authClient.useSession()
  const signingOut = useIsSigningOut()
  const hasSession = !!session.data?.session

  useLayoutEffect(() => {
    if (signingOut) {
      router.replace("/sign-in")
      return
    }

    if (isLoading || session.isPending) {
      return
    }

    if (isAuthenticated && hasSession) {
      router.replace("/library")
      return
    }

    router.replace("/sign-in")
  }, [
    hasSession,
    isAuthenticated,
    isLoading,
    router,
    session.isPending,
    signingOut,
  ])

  return <div className="atmosphere h-dvh overflow-hidden" aria-hidden />
}
