import type { ReactNode } from "react"
import { AccountMenu } from "src/components/layout/AccountMenu"
import { BrandLockup } from "src/components/layout/BrandLockup"
import { ThemeMenu } from "src/components/layout/ThemeMenu"
import { cn } from "src/lib/utils"

export type AppHeaderProps = {
  email?: string | null
  name?: string | null
  notebookTitle?: ReactNode
  showAccount?: boolean
  className?: string
}

export function AppHeader({
  email,
  name,
  notebookTitle,
  showAccount = true,
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/50",
        "bg-[color-mix(in_oklab,var(--background)_72%,transparent)] backdrop-blur-xl",
        "supports-backdrop-filter:bg-[color-mix(in_oklab,var(--background)_58%,transparent)]",
        className,
      )}
    >
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <BrandLockup to="/library" compact />
          {notebookTitle ? (
            <>
              <span
                className="hidden h-5 w-px shrink-0 bg-border/70 sm:block"
                aria-hidden
              />
              <div className="min-w-0 w-full max-w-200">{notebookTitle}</div>
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <ThemeMenu />
          {showAccount ? <AccountMenu email={email} name={name} /> : null}
        </div>
      </div>
    </header>
  )
}
