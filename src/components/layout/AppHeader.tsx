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
				"sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-[color:color-mix(in_oklab,var(--background)_88%,white)] px-4 backdrop-blur-md md:px-6",
				className,
			)}
		>
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<BrandLockup />
				{notebookTitle ? (
					<>
						<span
							className="hidden h-5 w-px shrink-0 bg-border sm:block"
							aria-hidden
						/>
						<div className="min-w-0 flex-1">{notebookTitle}</div>
					</>
				) : null}
			</div>
			<div className="flex shrink-0 items-center gap-1">
				<ThemeMenu />
				{showAccount ? <AccountMenu email={email} name={name} /> : null}
			</div>
		</header>
	)
}
