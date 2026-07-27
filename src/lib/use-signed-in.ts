import { useConvexAuth } from "convex/react"
import { useStore } from "zustand"
import { createStore } from "zustand/vanilla"

const signingOutStore = createStore<{ signingOut: boolean }>(() => ({
  signingOut: false,
}))

export function beginSignOut() {
  signingOutStore.setState({ signingOut: true })
}

export function useIsSigningOut() {
  return useStore(signingOutStore, (state) => state.signingOut)
}

/** True only after Convex has finished auth and validated a session. */
export function useIsSignedIn() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const signingOut = useIsSigningOut()

  return !signingOut && !isLoading && isAuthenticated
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
