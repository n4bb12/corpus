import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
  },
  plugins: [
    devtools(),
    nitro({
      preset: "vercel",
      vercel: {
        functions: {
          // Keep the fat ingest/chat function in the same EU region as the edge.
          maxDuration: 300,
          regions: ["fra1"],
        },
      },
      // These resolve runtime files from their package dirs; bundling breaks those paths.
      traceDeps: ["jsdom*", "pdfjs-dist*"],
    }),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
        maskPath: "/notebooks/__spa-shell",
      },
      pages: [{ path: "/" }, { path: "/sign-in" }],
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
      },
    }),
    viteReact(),
  ],
})

export default config
