import { ConvexHttpClient } from "convex/browser"
import { requirePublicEnv } from "src/lib/env"

export function createAuthedConvexClient(token: string) {
  const client = new ConvexHttpClient(requirePublicEnv("CONVEX_URL"))
  client.setAuth(token)
  return client
}
