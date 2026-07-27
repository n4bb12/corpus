import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router"
import type { ReactNode } from "react"
import { BrandLockup } from "src/components/layout/BrandLockup"
import { ThemeScript } from "src/components/layout/ThemeScript"
import { Button } from "src/components/ui/shadcn/button"
import { TooltipProvider } from "src/components/ui/shadcn/tooltip"
import { AppConvexProvider } from "src/integrations/convex/provider"
import styles from "src/styles.css?url"

type RootHeadLink = {
  href: string
  rel: string
  type?: string
  sizes?: string
}

const rootHeadLinks = [
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
] as const satisfies ReadonlyArray<RootHeadLink>

export const Route = createRootRoute({
  head: () => ({
    links: [...rootHeadLinks],
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
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function NotFoundPage() {
  return (
    <div className="atmosphere atmosphere-noise flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <BrandLockup />
      <div className="space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Page not found
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
          That route does not exist, or the notebook may have been removed.
        </p>
      </div>
      <Button asChild className="rounded-full">
        <Link to="/">Back to notebooks</Link>
      </Button>
    </div>
  )
}

function RootComponent() {
  return (
    <AppConvexProvider>
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
      <body className="h-dvh overflow-hidden bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
