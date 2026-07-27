import { describe, expect, test } from "bun:test"
import { patchVercelSpaRoutes } from "./patchVercelSpaRoutes"

describe("patchVercelSpaRoutes", () => {
  test("keeps assets and sends html to the spa shell", () => {
    expect(
      patchVercelSpaRoutes({
        routes: [
          {
            headers: {
              "cache-control": "public, max-age=31536000, immutable",
            },
            src: "/assets/(.*)",
          },
          { handle: "filesystem" },
          { src: "/(.*)", dest: "/__server" },
        ],
      }),
    ).toMatchInlineSnapshot(`
      {
        "routes": [
          {
            "headers": {
              "cache-control": "public, max-age=31536000, immutable",
            },
            "src": "/assets/(.*)",
          },
          {
            "handle": "filesystem",
          },
          {
            "dest": "/__server",
            "src": "/api/(.*)",
          },
          {
            "dest": "/__server",
            "src": "/_serverFn/(.*)",
          },
          {
            "dest": "/_shell.html",
            "src": "/(.*)",
          },
        ],
      }
    `)
  })
})
