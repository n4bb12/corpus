import { Navigate } from "@tanstack/react-router"
import { useConvexAuth } from "convex/react"
import { type ReactNode, useEffect, useState } from "react"
import { AppPending } from "src/components/layout/AppPending"
import { authClient } from "src/lib/authClient"
import { useIsSigningOut } from "src/lib/useSignedIn"

export type ClientAuthBoundaryProps = {
  children: ReactNode
  mode: "signed-in" | "signed-out"
}

export function ClientAuthBoundary({
  children,
  mode,
}: ClientAuthBoundaryProps) {
  const [mounted, setMounted] = useState(false)
  const { isAuthenticated, isLoading } = useConvexAuth()
  const session = authClient.useSession()
  const signingOut = useIsSigningOut()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Hold the pending shell through sign-out so we don't soft-navigate to
  // /sign-in and then remount it again after auth finishes clearing.
  if (signingOut) {
    return <AppPending />
  }

  // Wait for Better Auth session too — a cached JWT can make Convex look
  // authenticated before the session is ready, which races library queries.
  const authPending =
    !mounted || isLoading || (mode === "signed-in" && session.isPending)

  if (authPending) {
    return mode === "signed-in" ? <AppPending /> : children
  }

  const isSignedIn = isAuthenticated && !!session.data?.session

  if (mode === "signed-in" && !isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  if (mode === "signed-out" && isSignedIn) {
    return <Navigate to="/" replace />
  }

  return children
}
