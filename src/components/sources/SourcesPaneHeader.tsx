import { SourcesSearchField } from "src/components/sources/SourcesSearchField"

export type SourcesPaneHeaderProps = {
	sourceCount: number
	uploadNotice: string | null
	query: string
	onQueryChange: (value: string) => void
}

export function SourcesPaneHeader({
	sourceCount,
	uploadNotice,
	query,
	onQueryChange,
}: SourcesPaneHeaderProps) {
	return (
		<div className="flex flex-col gap-3 px-4 pt-4">
			<div className="flex h-10 items-center justify-between gap-3">
				<h2 className="text-sm font-semibold tracking-wide uppercase">
					Sources
				</h2>
				<p className="text-sm tabular-nums text-muted-foreground">
					{sourceCount} sources
				</p>
			</div>

			{uploadNotice ? (
				<p className="text-sm text-destructive" role="status">
					{uploadNotice}
				</p>
			) : null}

			{sourceCount >= 6 ? (
				<SourcesSearchField query={query} onQueryChange={onQueryChange} />
			) : null}
		</div>
	)
}
