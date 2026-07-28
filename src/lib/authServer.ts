import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs"
import { requirePublicEnv } from "src/lib/env"

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: requirePublicEnv("CONVEX_URL"),
  convexSiteUrl: requirePublicEnv("CONVEX_SITE_URL"),
})
