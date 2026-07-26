/**
 * After TanStack SPA prerender: ensure every app URL can be served as static HTML.
 * - `/` gets `index.html` (SPA shell; mask path `/` writes `_shell.html` only)
 * - unknown paths rewrite to `_shell.html` instead of the Nitro server
 */
import { copyFile, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const staticDir = join(".vercel/output/static")
const shellPath = join(staticDir, "_shell.html")
const indexPath = join(staticDir, "index.html")
const configPath = join(".vercel/output/config.json")

await copyFile(shellPath, indexPath)

const config = JSON.parse(await readFile(configPath, "utf8")) as {
	routes?: Array<Record<string, unknown>>
}

config.routes = [
	{
		headers: {
			"cache-control": "public, max-age=31536000, immutable",
		},
		src: "/assets/(.*)",
	},
	{ handle: "filesystem" },
	{ src: "/api/(.*)", dest: "/__server" },
	{ src: "/_serverFn/(.*)", dest: "/__server" },
	{ src: "/(.*)", dest: "/_shell.html" },
]

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`)

console.log("SPA static routes: index.html + _shell.html fallback")
