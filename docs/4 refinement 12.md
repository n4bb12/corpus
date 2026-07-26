# DOMMatrix reference error
_Exported on 7/26/2026 at 19:50:10 GMT+2 from Cursor (3.13.10)_

---

**User**

on any API or server function call:
ReferenceError: DOMMatrix is not defined

    at /var/task/_libs/markitdown-ts+[...].mjs:19777:24

    at moduleEvaluation (native:1:11)

    at moduleEvaluation (native:1:11)

    at requestImportModule (native:2)

    at processTicksAndRejections (native:7:39) {

  cause: ReferenceError: DOMMatrix is not defined

      at /var/task/_libs/markitdown-ts+[...].mjs:19777:24

      at moduleEvaluation (native:1:11)

      at moduleEvaluation (native:1:11)

      at requestImportModule (native:2)

      at processTicksAndRejections (native:7:39),

  status: 500,

  statusText: undefined,

  headers: undefined,

  data: undefined,

  body: undefined,

  unhandled: true

}

---

**Cursor**

`DOMMatrix` is a browser API — something in the `markitdown-ts` import chain is pulling it into a server/API context. I'll trace where that package is loaded and how the call path hits it.

There's prior notes on `markitdown-ts` / `jsdom` bundling — next I'll reproduce `DOMMatrix is not defined` with a minimal server import and inspect the call chain.

Local Bun import is fine — the failure is in the Vercel-bundled `markitdown-ts`. I'll reproduce against the server build and compare with biblebots' `pdfjs-dist` tracing.

Local import works because resolution walks up to project `node_modules` and finds `@napi-rs/canvas`. I'll isolate the Vercel function package so that can't happen and reproduce the crash.

Reproduced the exact `ReferenceError: DOMMatrix is not defined`. Ranked hypotheses next, then I'll test the strongest fix.

Build traced `@napi-rs/canvas`. Updating the repro to verify the fix against an isolated function package (Vercel-like).

Tracing `@napi-rs/canvas` isn't enough — the native platform package never lands in the function bundle, so the polyfill still fails on Vercel. Installing a pure-JS `DOMMatrix` before `markitdown`/`pdf-parse` load.

Polyfill fixes the crash when canvas natives are missing. Rebuilding to confirm the production graph loads it before `markitdown-ts`.

The bundler inlined the polyfill into the module body while keeping `markitdown-ts` as a top-level import, so it still evaluates first. Injecting the polyfill into the `markitdown-ts` chunk itself so it runs before `new DOMMatrix()`.

The bundler deferred the polyfill into an `__esmMin` init call, so it still runs after `pdfjs` loads. Copying the canvas native packages into the function output so pdfjs can polyfill `DOMMatrix` itself.

Natives are in the package. `ws` (a jsdom dependency) wasn't traced — I'll add it and re-run the isolated repro under Bun, matching Vercel.

**Cause:** `markitdown-ts` → `pdfjs-dist` runs `new DOMMatrix()` at module load. It tries to polyfill from `@napi-rs/canvas`, but Nitro only traced the JS package, not the optional Linux native bindings. On Vercel that `require` fails, so every shared server import that pulls this graph (any API route) blows up with `DOMMatrix is not defined`.

**Fix:**
1. Trace `pdfjs-dist*` and `@napi-rs/canvas*` (same idea as biblebots).
2. On Nitro `compiled`, copy `@napi-rs/canvas-linux-x64-gnu` and `…-musl` into the function `node_modules`.

Verified with an isolated Bun import of the server chunk: red without natives, green with them.

Redeploy to pick this up.

---

**User**

Pretty sure biblebots doesn't need copyCanvasNatives

---

**Cursor**

I'll check how biblebots gets canvas natives without a copy hook, and whether we can match that instead.

Biblebots only traces `pdfjs-dist*` and ships `@napi-rs/canvas` without the native packages — I'll dig into why that doesn't blow up for them.

You're right — biblebots doesn't copy natives either, and an isolated biblebots-style tree still hits the same `DOMMatrix` crash. Their real edge is not loading that graph on every request. I'll drop `copyCanvasNatives` and lazy-load + polyfill instead.

You're right. Biblebots doesn't copy natives either — and their traced tree also lacks them. An isolated biblebots-style import of `pdfjs` hits the same `DOMMatrix` crash.

What they avoid is **eagerly evaluating** that graph on every request. Corpus was pulling `markitdown-ts` into the shared server bundle at load time.

Dropped `copyCanvasNatives`. Now:
1. `traceDeps` matches biblebots (`jsdom*`, `pdfjs-dist*`)
2. Dynamic import of markitdown/pdf-parse only when normalizing
3. Pure-JS `DOMMatrix` from `@napi-rs/canvas/geometry.js` right before that import

Router loads clean without natives; conversion path polyfills then loads markitdown successfully.

