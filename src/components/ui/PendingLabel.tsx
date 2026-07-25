import type { ReactNode } from "react"
import { TripleDot } from "src/components/ui/TripleDot"
import { cn } from "src/lib/utils"

export type PendingLabelProps = {
	pending: boolean
	children: ReactNode
	className?: string
	pendingLabel?: string
}

export function PendingLabel({
	pending,
	children,
	className,
	pendingLabel = "Loading",
}: PendingLabelProps) {
	return (
		<span
			className={cn(
				"relative inline-flex items-center justify-center",
				className,
			)}
		>
			<span className={cn("inline-flex items-center", pending && "invisible")}>
				{children}
			</span>
			{pending ? (
				<span className="absolute inset-0 flex items-center justify-center">
					<TripleDot label={pendingLabel} />
				</span>
			) : null}
		</span>
	)
}
