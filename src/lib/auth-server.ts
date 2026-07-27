import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start"
import { requireEnv } from "src/lib/env"

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({
  convexUrl: requireEnv("VITE_CONVEX_URL"),
  convexSiteUrl: requireEnv("VITE_CONVEX_SITE_URL"),
})
