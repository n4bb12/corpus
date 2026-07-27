import { createRequire } from "node:module"

/**
 * pdfjs-dist does `new DOMMatrix()` at module load. `@napi-rs/canvas` can fail
 * to load its native binding in the Vercel function package; geometry.js is
 * pure JS and is enough for module evaluation / text extraction.
 */
export function ensureDomMatrix() {
  if (globalThis.DOMMatrix) {
    return
  }

  const require = createRequire(import.meta.url)
  const { DOMMatrix } = require("@napi-rs/canvas/geometry.js") as {
    DOMMatrix: typeof globalThis.DOMMatrix
  }

  globalThis.DOMMatrix = DOMMatrix
}
