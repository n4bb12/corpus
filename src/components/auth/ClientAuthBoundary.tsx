import { Navigate } from "@tanstack/react-router"
import { useConvexAuth } from "convex/react"
import { type ReactNode, useEffect, useState } from "react"
import { AppPending } from "src/components/layout/AppPending"
import { useIsSigningOut } from "src/lib/use-signed-in"

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
	const signingOut = useIsSigningOut()

	useEffect(() => {
		setMounted(true)
	}, [])

	if (!mounted || isLoading) {
		return mode === "signed-in" ? <AppPending /> : children
	}

	const isSignedIn = !signingOut && isAuthenticated

	if (mode === "signed-in" && !isSignedIn) {
		return <Navigate to="/sign-in" replace />
	}

	if (mode === "signed-out" && isSignedIn) {
		return <Navigate to="/" replace />
	}

	return children
}
