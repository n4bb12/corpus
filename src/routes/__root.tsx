/// <reference types="vite/client" />
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
	useRouteContext,
} from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { TooltipProvider } from "src/components/ui/tooltip"
import { AppConvexProvider } from "src/integrations/convex/provider"
import { getToken } from "src/lib/auth-server"
import appCss from "src/styles.css?url"

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
	return await getToken()
})

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Corpus",
			},
			{
				name: "description",
				content: "Grounded notebooks for your sources.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
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
})

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

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){try{var p=localStorage.getItem('corpus-theme')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
					}}
				/>
			</head>
			<body className="min-h-dvh bg-background text-foreground">
				{children}
				<Scripts />
			</body>
		</html>
	)
}
