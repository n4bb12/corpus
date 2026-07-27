import { createStart } from "@tanstack/react-start"

export const startInstance = createStart(() => ({
  // Prerender `/` and `/sign-in` as real page HTML. Notebook URLs stay
  // client-only via `ssr: false` on that route + the SPA shell fallback.
  defaultSsr: true,
}))
