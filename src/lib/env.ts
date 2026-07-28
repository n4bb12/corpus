export function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is not set`)
  }

  return value
}

const publicEnv = {
  CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
} as const

/** Client-safe public env (`NEXT_PUBLIC_*`). */
export function requirePublicEnv(name: keyof typeof publicEnv): string {
  const value = publicEnv[name]

  if (typeof value !== "string" || !value) {
    throw new Error(`NEXT_PUBLIC_${name} is not set`)
  }

  return value
}
