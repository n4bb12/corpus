import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { AppPending } from "src/components/layout/AppPending"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    // Auth leaves via full navigations (OAuth / magic link), not client routing
    // into the app — don't preload `/` from BrandLockup on /sign-in.
    defaultPreload: false,
    // Only used for client-only routes (notebooks) and the SPA shell mask.
    // `/` and `/sign-in` SSR real page HTML during prerender.
    defaultPendingComponent: AppPending,
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
