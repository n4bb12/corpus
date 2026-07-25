import { cn } from "src/lib/utils"

export type TripleDotProps = {
	className?: string
	label?: string
}

export function TripleDot({ className, label = "Loading" }: TripleDotProps) {
	return (
		<span
			aria-label={label}
			className={cn("inline-flex items-center gap-1", className)}
			role="status"
		>
			<span className="size-1.5 animate-[triple-dot_1.05s_ease-in-out_infinite] rounded-full bg-current" />
			<span className="size-1.5 animate-[triple-dot_1.05s_ease-in-out_0.15s_infinite] rounded-full bg-current" />
			<span className="size-1.5 animate-[triple-dot_1.05s_ease-in-out_0.3s_infinite] rounded-full bg-current" />
		</span>
	)
}
