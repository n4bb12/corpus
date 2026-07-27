import { useNavigate } from "@tanstack/react-router"
import { useConvexAuth } from "convex/react"
import { type ReactNode, useEffect, useLayoutEffect } from "react"
import { authClient } from "src/lib/authClient"
import { endSignOut, useIsSigningOut } from "src/lib/useSignedIn"
import { SignInPage } from "src/pages/SignInPage"

export type ClientAuthBoundaryProps = {
  children: ReactNode
  mode: "signed-in" | "signed-out"
}

/** Paint sign-in immediately — TanStack `<Navigate>` returns null and flashes empty. */
function RedirectToSignIn() {
  const navigate = useNavigate()

  useLayoutEffect(() => {
    void navigate({ to: "/sign-in", replace: true })
  }, [navigate])

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

  // Drop the flag only after the session is actually gone so we never remount
  // signed-in pages between the sign-out click and a settled sign-in route.
  useEffect(() => {
    if (!signingOut || session.isPending || hasSession) {
      return
    }

    endSignOut()
  }, [signingOut, session.isPending, hasSession])

  // While signing out: show sign-in immediately and keep it mounted. Never
  // AppPending (empty) or the library shell (header, no data).
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

  // Never block first paint on auth. Pages render immediately; queries already
  // skip via useSignedInQueryArgs until the session is ready.
  if (!authReady) {
    return children
  }

  if (mode === "signed-out" && isSignedIn) {
    return <NavigateHome />
  }

  return children
}

function NavigateHome() {
  const navigate = useNavigate()

  useLayoutEffect(() => {
    void navigate({ to: "/", replace: true })
  }, [navigate])

  return null
}
