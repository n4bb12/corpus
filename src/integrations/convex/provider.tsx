import {
	type AuthClient,
	ConvexBetterAuthProvider,
} from "@convex-dev/better-auth/react"
import { ConvexReactClient } from "convex/react"
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache"
import { authClient } from "#/lib/auth-client"

const convexUrl = import.meta.env.VITE_CONVEX_URL

if (!convexUrl) {
	throw new Error("VITE_CONVEX_URL is not set")
}

export const convexClient = new ConvexReactClient(convexUrl)

export type AppConvexProviderProps = {
	children: React.ReactNode
	initialToken?: string | null
}

export function AppConvexProvider({
	children,
	initialToken,
}: AppConvexProviderProps) {
	return (
		<ConvexBetterAuthProvider
			client={convexClient}
			authClient={authClient as unknown as AuthClient}
			initialToken={initialToken}
		>
			<ConvexQueryCacheProvider>{children}</ConvexQueryCacheProvider>
		</ConvexBetterAuthProvider>
	)
}
