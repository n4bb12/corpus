import { useQuery } from "convex-helpers/react/cache"
import { useEffect, useState } from "react"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { useSignedInQueryArgs } from "src/lib/use-signed-in"

export function useSourcePreviewMarkdown(previewSourceId?: string | null) {
	const previewUrl = useQuery(
		api.sources.getNormalizedContent,
		useSignedInQueryArgs(
			previewSourceId ? { sourceId: previewSourceId as Id<"sources"> } : "skip",
		),
	)
	const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null)

	useEffect(() => {
		if (!previewUrl) {
			setPreviewMarkdown(null)
			return
		}

		let cancelled = false

		void fetch(previewUrl)
			.then((response) => response.text())
			.then((text) => {
				if (!cancelled) {
					setPreviewMarkdown(text)
				}
			})
			.catch(() => {
				if (!cancelled) {
					setPreviewMarkdown("Could not load source preview.")
				}
			})

		return () => {
			cancelled = true
		}
	}, [previewUrl])

	return previewMarkdown
}
