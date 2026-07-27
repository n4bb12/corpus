import { Navigate } from "@tanstack/react-router"
import { useConvexAuth } from "convex/react"
import type { ReactNode } from "react"
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
  const { isAuthenticated, isLoading } = useConvexAuth()
  const session = authClient.useSession()
  const signingOut = useIsSigningOut()

  // Hold the pending shell through sign-out so we don't soft-navigate to
  // /sign-in and then remount it again after auth finishes clearing.
  if (signingOut) {
    return <AppPending />
  }

  // Never block first paint on auth. Pages render immediately; queries already
  // skip via useSignedInQueryArgs until the session is ready. Redirect only
  // once both Convex auth and Better Auth have settled.
  const authReady = !isLoading && !session.isPending

  if (!authReady) {
    return children
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
