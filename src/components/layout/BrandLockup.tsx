import { BookOpen } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { cn } from "src/lib/utils"

export type BrandLockupProps = {
	className?: string
	to?: string
}

export function BrandLockup({ className, to = "/" }: BrandLockupProps) {
	return (
		<Link
			to={to}
			className={cn(
				"inline-flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
				className,
			)}
		>
			<span className="flex size-10 items-center justify-center rounded-sm bg-primary/10 text-primary shadow-(--shadow-pine)">
				<BookOpen size={22} aria-hidden />
			</span>
			<span className="text-lg font-bold tracking-tight text-foreground">
				Corpus
			</span>
		</Link>
	)
}
