import type { ReactNode } from "react"
import { BrandLockup } from "src/components/layout/BrandLockup"
import { ThemeMenu } from "src/components/layout/ThemeMenu"
import { cn } from "src/lib/utils"

export type AuthShellProps = {
	children: ReactNode
	className?: string
}

export function AuthShell({ children, className }: AuthShellProps) {
	return (
		<div className="atmosphere atmosphere-noise relative min-h-dvh">
			<div className="relative z-10 flex min-h-dvh flex-col">
				<header className="flex h-16 items-center justify-between px-4 md:px-6">
					<BrandLockup />
					<ThemeMenu />
				</header>
				<main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8">
					<div
						className={cn(
							"w-full max-w-[28rem] rounded-2xl border border-border bg-card p-6 shadow-(--shadow-pine)",
							className,
						)}
					>
						{children}
					</div>
				</main>
			</div>
		</div>
	)
}
