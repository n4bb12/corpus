import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(rootDir, "src")

/** @type {import('next').NextConfig} */
function publicEnv(name) {
  return process.env[`NEXT_PUBLIC_${name}`] ?? process.env[`VITE_${name}`] ?? ""
}

const nextConfig = {
  experimental: {
    useTypeScriptCli: true,
  },
  env: {
    NEXT_PUBLIC_CONVEX_URL: publicEnv("CONVEX_URL"),
    NEXT_PUBLIC_CONVEX_SITE_URL: publicEnv("CONVEX_SITE_URL"),
    NEXT_PUBLIC_SITE_URL: publicEnv("SITE_URL"),
  },
  serverExternalPackages: ["jsdom", "markitdown-ts", "pdfjs-dist", "pdfvision"],
  turbopack: {
    resolveAlias: {
      src: srcDir,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      src: srcDir,
    }

    return config
  },
}

export default nextConfig
