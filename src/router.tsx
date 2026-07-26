import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { AppPending } from "src/components/layout/AppPending"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "render",
		defaultPendingComponent: AppPending,
	})

	return router
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>
	}
}
