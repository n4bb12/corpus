import { copyFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

const require = createRequire(import.meta.url)

async function copyJsdomXhrSyncWorker(serverDir: string) {
	const jsdomRoot = dirname(require.resolve("jsdom/package.json"))
	const workerSrc = join(jsdomRoot, "lib/jsdom/living/xhr/xhr-sync-worker.js")

	await copyFile(workerSrc, join(serverDir, "xhr-sync-worker.js"))
}

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
					maxDuration: 300,
				},
			},
			hooks: {
				async compiled(nitro) {
					// jsdom resolves ./xhr-sync-worker.js via a shared __require rooted
					// at _runtime.mjs; the worker is not emitted by the bundler.
					await copyJsdomXhrSyncWorker(nitro.options.output.serverDir)
				},
			},
		}),
		tailwindcss(),
		tanstackStart({
			prerender: {
				enabled: true,
				crawlLinks: true,
			},
		}),
		viteReact(),
	],
})

export default config
