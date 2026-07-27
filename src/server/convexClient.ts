import { ConvexHttpClient } from "convex/browser"
import { requireEnv } from "src/lib/env"

export function createAuthedConvexClient(token: string) {
  const client = new ConvexHttpClient(requireEnv("VITE_CONVEX_URL"))
  client.setAuth(token)
  return client
}
