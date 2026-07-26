import { LoaderCircle } from "lucide-react"
import { formatTitle } from "src/lib/source_title"
import type { UploadingSource } from "src/lib/uploading_sources"

export type UploadingSourceListItemProps = {
	source: UploadingSource
}

export function UploadingSourceListItem({
	source,
}: UploadingSourceListItemProps) {
	const label = formatTitle(source.title)

	return (
		<div className="relative flex items-start gap-2 rounded-xl px-2 py-2">
			<span className="mt-0.5 text-primary">
				<LoaderCircle size={18} className="animate-spin" />
			</span>
			<span className="min-w-0 flex-1">
				<span className="line-clamp-2 text-sm font-medium">{label}</span>
				<span className="mt-0.5 block text-xs text-muted-foreground">
					Uploading
				</span>
			</span>
		</div>
	)
}
