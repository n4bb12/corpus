import { useConvexAuth } from "convex/react"

/** True only after Convex has finished auth and validated a session. */
export function useIsSignedIn() {
	const { isAuthenticated, isLoading } = useConvexAuth()

	return !isLoading && isAuthenticated
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
