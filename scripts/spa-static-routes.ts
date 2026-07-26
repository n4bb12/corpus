/**
 * Keep page requests on prerendered HTML or the static SPA template.
 * Nitro remains reachable only for API and server-function requests.
 */
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const configPath = join(".vercel/output/config.json")

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

console.log("Static pages: prerendered HTML + _shell.html fallback")
