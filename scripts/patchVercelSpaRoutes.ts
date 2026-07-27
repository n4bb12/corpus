import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

export type VercelBuildConfig = {
  routes?: Array<Record<string, unknown>>
  [key: string]: unknown
}

/**
 * Nitro currently emits a HTML catch-all to `__server`, which cold-starts the
 * API bundle on every document navigation. Keep static assets + filesystem,
 * send APIs to `__server`, and fall back to the SPA shell for everything else.
 */
export function patchVercelSpaRoutes(config: VercelBuildConfig) {
  const retained = (config.routes ?? []).filter((route) => {
    if (route.handle === "filesystem") {
      return true
    }

    if (typeof route.src === "string" && route.src.startsWith("/assets/")) {
      return true
    }

    return false
  })

  return {
    ...config,
    routes: [
      ...retained,
      {
        src: "/api/(.*)",
        dest: "/__server",
      },
      {
        src: "/_serverFn/(.*)",
        dest: "/__server",
      },
      {
        src: "/(.*)",
        dest: "/_shell.html",
      },
    ],
  }
}

export function patchVercelOutputRoutes(outputDir = ".vercel/output") {
  const configPath = join(outputDir, "config.json")
  const config = JSON.parse(
    readFileSync(configPath, "utf8"),
  ) as VercelBuildConfig

  writeFileSync(
    configPath,
    `${JSON.stringify(patchVercelSpaRoutes(config), null, 2)}\n`,
  )
}
