import { cn } from "src/lib/utils"

export type NotebookMobileTabsProps = {
	tab: "sources" | "chat"
	onTabChange: (tab: "sources" | "chat") => void
}

export function NotebookMobileTabs({
	tab,
	onTabChange,
}: NotebookMobileTabsProps) {
	return (
		<div className="sticky top-16 z-20 border-b border-border/40 bg-background/80 px-4 py-2 backdrop-blur-xl md:hidden">
			<div className="grid grid-cols-2 rounded-xl bg-muted/70 p-1 ring-1 ring-foreground/5">
				{(
					[
						{ value: "sources", label: "Sources" },
						{ value: "chat", label: "Chat" },
					] as const
				).map(({ value, label }) => (
					<button
						key={value}
						type="button"
						className={cn(
							"rounded-lg px-3 py-2 text-sm font-medium transition-all duration-(--duration-layout) ease-spring",
							tab === value
								? "bg-card text-foreground shadow-(--shadow-pine)"
								: "text-muted-foreground hover:text-foreground",
						)}
						aria-pressed={tab === value}
						onClick={() => onTabChange(value)}
					>
						{label}
					</button>
				))}
			</div>
		</div>
	)
}
