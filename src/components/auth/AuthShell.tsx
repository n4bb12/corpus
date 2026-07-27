import type { ReactNode } from "react"
import { AuthDecorations } from "src/components/auth/AuthDecorations"
import { BrandLockup } from "src/components/layout/BrandLockup"
import { ThemeMenu } from "src/components/layout/ThemeMenu"
import { cn } from "src/lib/utils"

export type AuthShellProps = {
  children: ReactNode
  className?: string
}

export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div className="atmosphere atmosphere-noise relative min-h-dvh overflow-hidden">
      <AuthDecorations />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-5 md:p-8 lg:p-10">
          <div className="pointer-events-auto rounded-full bg-card/50 px-3 py-1.5 shadow-(--shadow-pine) ring-1 ring-foreground/5 backdrop-blur-xl">
            <BrandLockup />
          </div>
          <div className="pointer-events-auto rounded-full bg-card/50 p-1 shadow-(--shadow-pine) ring-1 ring-foreground/5 backdrop-blur-xl">
            <ThemeMenu className="rounded-full" />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-28 md:px-8 md:py-32">
          <div className={cn("w-full", className)}>{children}</div>
        </main>
      </div>
    </div>
  )
}
