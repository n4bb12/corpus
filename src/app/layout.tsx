import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ConvexProvider } from "src/components/context/ConvexProvider"
import { ThemeScript } from "src/components/layout/ThemeScript"
import { TooltipProvider } from "src/components/ui/shadcn/tooltip"
import { requirePublicEnv } from "src/lib/env"
import "src/styles.css"

const convexOrigin = new URL(requirePublicEnv("CONVEX_URL")).origin

export const metadata: Metadata = {
  title: "Corpus",
  description: "Research your sources with grounded AI answers",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={convexOrigin} crossOrigin="anonymous" />
        <ThemeScript />
      </head>
      <body className="h-dvh overflow-hidden bg-background text-foreground">
        <ConvexProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </ConvexProvider>
      </body>
    </html>
  )
}
