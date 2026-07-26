import type { ReactNode } from "react"
import { cn } from "src/lib/utils"

export type EyebrowProps = {
	children: ReactNode
	tone?: "pine" | "muted"
	className?: string
}

export function Eyebrow({ children, tone = "pine", className }: EyebrowProps) {
	return (
		<span
			className={cn(
				"inline-flex rounded-full px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase",
				tone === "pine" && "bg-primary/10 text-primary",
				tone === "muted" && "bg-muted text-muted-foreground",
				className,
			)}
		>
			{children}
		</span>
	)
}
