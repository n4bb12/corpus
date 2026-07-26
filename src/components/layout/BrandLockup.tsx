import { Link } from "@tanstack/react-router"
import { BookOpen } from "lucide-react"
import { cn } from "src/lib/utils"

export type BrandLockupProps = {
	className?: string
	to?: string
	compact?: boolean
}

export function BrandLockup({
	className,
	to = "/",
	compact = false,
}: BrandLockupProps) {
	return (
		<Link
			to={to}
			className={cn(
				"group inline-flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
				className,
			)}
		>
			<span
				className={cn(
					"flex items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105",
					compact ? "size-9" : "size-10",
				)}
			>
				<BookOpen size={compact ? 18 : 22} aria-hidden strokeWidth={1.5} />
			</span>
			<span
				className={cn(
					"font-heading font-semibold tracking-tight text-foreground",
					compact ? "text-base" : "text-lg",
				)}
			>
				Corpus
			</span>
		</Link>
	)
}
