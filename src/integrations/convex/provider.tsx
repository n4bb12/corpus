import {
	type AuthClient,
	ConvexBetterAuthProvider,
} from "@convex-dev/better-auth/react"
import { ConvexReactClient } from "convex/react"
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache"
import type { ReactNode } from "react"
import { authClient } from "src/lib/auth-client"
import { requireViteEnv } from "src/lib/env"

const convexUrl = requireViteEnv("VITE_CONVEX_URL")

export const convexClient = new ConvexReactClient(convexUrl)

export type AppConvexProviderProps = {
	children: ReactNode
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
