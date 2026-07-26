import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
	useRouteContext,
} from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import type { ReactNode } from "react"
import { BrandLockup } from "src/components/layout/BrandLockup"
import { ThemeScript } from "src/components/layout/ThemeScript"
import { Button } from "src/components/ui/button"
import { TooltipProvider } from "src/components/ui/tooltip"
import { AppConvexProvider } from "src/integrations/convex/provider"
import { getToken } from "src/lib/auth-server"
import styles from "src/styles.css?url"

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
	return await getToken()
})

export const Route = createRootRoute({
	head: () => ({
		links: [
			{
				href: "/favicon.svg",
				rel: "icon",
				type: "image/svg+xml",
			},
			{
				href: "/favicon.ico",
				rel: "shortcut icon",
			},
			{
				href: "/favicon-96x96.png",
				rel: "icon",
				sizes: "96x96",
				type: "image/png",
			},
			{
				href: "/apple-touch-icon.png",
				rel: "apple-touch-icon",
				sizes: "180x180",
			},
			{
				href: "/site.webmanifest",
				rel: "manifest",
			},
			{
				href: styles,
				rel: "stylesheet",
			},
		],
		meta: [
			{
				charSet: "utf-8",
			},
			{
				content: "width=device-width, initial-scale=1",
				name: "viewport",
			},
			{
				title: "Corpus",
			},
			{
				content: "Research your sources with grounded AI answers",
				name: "description",
			},
		],
	}),
	beforeLoad: async () => {
		const token = await getAuth()

		return {
			token,
			isAuthenticated: !!token,
		}
	},
	component: RootComponent,
	shellComponent: RootDocument,
	notFoundComponent: NotFoundPage,
})

function NotFoundPage() {
	return (
		<div className="atmosphere flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
			<BrandLockup />
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Page not found
				</h1>
				<p className="text-sm text-muted-foreground">
					That route does not exist, or the notebook may have been removed.
				</p>
			</div>
			<Button asChild className="rounded-sm">
				<Link to="/">Back to notebooks</Link>
			</Button>
		</div>
	)
}

function RootComponent() {
	const context = useRouteContext({ from: Route.id })

	return (
		<AppConvexProvider initialToken={context.token}>
			<TooltipProvider delayDuration={200}>
				<Outlet />
			</TooltipProvider>
		</AppConvexProvider>
	)
}

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<ThemeScript />
			</head>
			<body className="min-h-dvh bg-background text-foreground">
				{children}
				<Scripts />
			</body>
		</html>
	)
}
