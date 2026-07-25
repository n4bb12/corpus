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
				<header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-6 md:p-8 lg:p-10">
					<div className="pointer-events-auto">
						<BrandLockup />
					</div>
					<div className="pointer-events-auto">
						<ThemeMenu />
					</div>
				</header>
				<main className="flex flex-1 items-center justify-center px-4 py-24 md:px-8 md:py-28">
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
