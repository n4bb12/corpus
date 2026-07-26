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
		<div className="flex flex-col gap-4 px-8 pt-5">
			<div className="flex h-10 items-center justify-between gap-3">
				<h2 className="font-heading text-lg font-semibold tracking-tight">
					Sources
				</h2>
				<p className="rounded-full bg-muted/70 px-3 py-1 text-xs tabular-nums text-muted-foreground">
					{sourceCount}
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
