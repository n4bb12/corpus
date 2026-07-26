# Prod deployment file error
_Exported on 7/26/2026 at 05:38:15 GMT+2 from Cursor (3.13.10)_

---

**User**

Accessing the prod deployment downloads a file with 

{"name":"ResolveMessage","position":null,"message":"Cannot find module './xhr-sync-worker.js' from '/vercel/path0/.vercel/output/functions/__server.func/_runtime.mjs'","level":"error","specifier":"./xhr-sync-worker.js","importKind":"require-resolve","referrer":"/vercel/path0/.vercel/output/functions/__server.func/_runtime.mjs"}

---

**Cursor**

That error usually means a server bundle is pulling in jsdom (or another XHR polyfill) and trying to resolve `xhr-sync-worker.js` at runtime. I’ll dig into where that dependency is coming from and how the Vercel server build is packaging it.

`jsdom` (via `markitdown-ts`) looks like the source of `xhr-sync-worker.js`. Next I’ll trace how that ends up in the Vercel server bundle and set up a repro.

Visiting any prod URL failing points to jsdom being pulled into the shared server bundle at startup. I’ll check the Vite/Nitro config and try to reproduce the missing worker in a local build.

There's already a local Vercel output — I'll inspect the server function bundle for the missing worker and try to reproduce the resolve failure.

Reproduced the exact missing-worker error. Next I’ll confirm whether prerender/SSR is baking that failure into the deployed page output.

Confirmed: the shared `__require` resolves the worker next to `_runtime.mjs`, and that file isn’t emitted. Next I’ll try externalizing `jsdom` (and a build-time copy if needed) and re-run the feedback loop.

`compiled` runs after the Nitro server build and before TanStack’s post-build prerender, so copying the worker there should unblock both. Implementing that and verifying with a rebuild.

Dropping the `rollupConfig` plugin — `defu` can replace Nitro’s plugin array. Keeping only the `compiled` hook.

Prerender completed successfully. Verifying the static pages and that JSDOM can load.

**Prod was serving failed prerender output**, not a live runtime crash.

`markitdown-ts` pulls in `jsdom`, which does `require.resolve("./xhr-sync-worker.js")` through a shared `__require` rooted at `_runtime.mjs`. The bundler never emits that worker, so prerender failed and wrote the `ResolveMessage` JSON as `/` and `/sign-in`.

**Fix:** copy `xhr-sync-worker.js` into the Nitro server output on `compiled` in `vite.config.ts`. Rebuild now produces real HTML and JSDOM loads cleanly.

Redeploy to pick this up.

---

**User**

Why does the client bundle need jsdom or markitdown-ts?

---

**Cursor**

They shouldn’t — I’ll check whether `jsdom`/`markitdown-ts` actually land in the client build, or only in the SSR/server graph via the ingest import chain.

It doesn’t. The **client** assets have neither package.

They only show up in the **SSR/server** graph because:

`/api/sources/ingest` → `processSource` → `normalize` → `markitdown-ts` → `jsdom`

That API route is pulled into the shared SSR router bundle, so prerender/SSR loads jsdom even for `/` and `/sign-in`. That’s a server bundling issue, not a client dependency.

---

**User**

~/git/church/biblebots/dashboard uses markitdown-ts and tanstack, too, but it doesn't have that issue.

---

**Cursor**

I’ll compare how that dashboard imports and bundles `markitdown-ts` versus this app — likely a different server boundary or Nitro/Vite config.

Because that app already treats `jsdom` as an **external traced package**, and it never hits the failure path this one did.

In biblebots:

```73:76:/home/n4bb12/git/church/biblebots/dashboard/vite.config.ts
    nitro: {
      // These dependencies resolve runtime files from their package directories; bundling breaks those paths.
      traceDeps: ["@ffmpeg-installer/ffmpeg*", "fluent-ffmpeg*", "jsdom*", "pdfjs-dist*"],
    },
```

Also:

1. `prerender.enabled: false` — no static pages get baked from a broken SSR render  
2. root `ssr: false` — SPA shell, so page requests don’t run the markitdown/jsdom server graph on every load

Corpus was **bundling** `jsdom` into `_libs/jsdom.mjs`, which breaks `require.resolve("./xhr-sync-worker.js")`. Biblebots **traces** `jsdom*` into `node_modules` so the worker file stays next to the real package code.

The worker-copy hook we added is a workaround for the bundled case. Matching biblebots with `traceDeps: ["jsdom*"]` is the cleaner fix — and you could drop the copy hook if that works.

---

**User**

Go.

---

**Cursor**

Switching to `traceDeps: ["jsdom*"]` like biblebots and removing the worker-copy workaround.

Done. Switched to `traceDeps: ["jsdom*"]` and removed the worker-copy hook.

Verified: jsdom is traced into the function `node_modules` (with `xhr-sync-worker.js`), prerender emits real HTML, and MarkItDown converts HTML successfully.

