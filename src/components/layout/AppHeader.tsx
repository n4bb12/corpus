import { AccountMenu } from "#/components/layout/AccountMenu"
import { BrandLockup } from "#/components/layout/BrandLockup"
import { ThemeMenu } from "#/components/layout/ThemeMenu"
import { cn } from "#/lib/utils"

export type AppHeaderProps = {
	email?: string | null
	name?: string | null
	notebookTitle?: React.ReactNode
	showAccount?: boolean
	className?: string
	workspace?: boolean
}

export function AppHeader({
	email,
	name,
	notebookTitle,
	showAccount = true,
	className,
	workspace = false,
}: AppHeaderProps) {
	if (workspace) {
		return (
			<header
				className={cn(
					"sticky top-0 z-30 grid h-16 shrink-0 border-b border-border/80 bg-[color:var(--header-bg,color-mix(in_oklab,var(--background)_88%,white))] backdrop-blur-md",
					"md:grid-cols-[25rem_minmax(0,1fr)]",
					className,
				)}
			>
				<div className="flex h-16 items-center px-4 md:px-5">
					<BrandLockup />
				</div>
				<div className="flex h-16 items-center justify-between gap-3 border-t border-border/60 px-4 md:border-t-0 md:px-5">
					<div className="min-w-0 flex-1">{notebookTitle}</div>
					<div className="flex items-center gap-1">
						<ThemeMenu />
						{showAccount ? <AccountMenu email={email} name={name} /> : null}
					</div>
				</div>
			</header>
		)
	}

	return (
		<header
			className={cn(
				"sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-[color:color-mix(in_oklab,var(--background)_88%,white)] px-4 backdrop-blur-md md:px-6",
				className,
			)}
		>
			<BrandLockup />
			<div className="flex items-center gap-1">
				<ThemeMenu />
				{showAccount ? <AccountMenu email={email} name={name} /> : null}
			</div>
		</header>
	)
}
