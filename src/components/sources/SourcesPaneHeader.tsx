import { SourcesSearchField } from "src/components/sources/SourcesSearchField"

export type SourcesPaneHeaderProps = {
	sourceCount: number
	sourcesLoading?: boolean
	uploadNotice: string | null
	query: string
	onQueryChange: (value: string) => void
}

export function SourcesPaneHeader({
	sourceCount,
	sourcesLoading = false,
	uploadNotice,
	query,
	onQueryChange,
}: SourcesPaneHeaderProps) {
	return (
		<div className="flex flex-col gap-4 p-4 pb-0">
			<div className="flex h-10 items-center justify-between gap-3">
				<h2 className="font-heading text-lg font-semibold tracking-tight">
					Sources
				</h2>
				{sourcesLoading ? (
					<>
						<span className="sr-only" role="status">
							Loading source count
						</span>
						<p
							className="rounded-full bg-muted/70 px-3 py-1 text-xs tabular-nums text-muted-foreground placeholder-shimmer"
							aria-hidden
						>
							00
						</p>
					</>
				) : (
					<p className="rounded-full bg-muted/70 px-3 py-1 text-xs tabular-nums text-muted-foreground">
						<span className="sr-only">Source count: </span>
						{sourceCount}
					</p>
				)}
			</div>

			{uploadNotice ? (
				<p className="text-sm text-destructive" role="status">
					{uploadNotice}
				</p>
			) : null}

			{!sourcesLoading && sourceCount >= 6 ? (
				<SourcesSearchField query={query} onQueryChange={onQueryChange} />
			) : null}
		</div>
	)
}
