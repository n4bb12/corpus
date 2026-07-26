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
		<div className="sticky top-16 z-20 border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:hidden">
			<div className="grid grid-cols-2 rounded-xl bg-muted p-1 shadow-(--shadow-pine)">
				{(["sources", "chat"] as const).map((value) => (
					<button
						key={value}
						type="button"
						className={cn(
							"rounded-sm px-3 py-2 text-sm font-medium capitalize transition",
							tab === value
								? "bg-card text-foreground shadow-sm"
								: "text-muted-foreground",
						)}
						onClick={() => onTabChange(value)}
					>
						{value}
					</button>
				))}
			</div>
		</div>
	)
}
