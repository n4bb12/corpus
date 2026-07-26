import { nanoid } from "nanoid"
import type { Id } from "src/convex/_generated/dataModel"
import { describeRejectedFile, isAcceptedUpload } from "src/lib/file_types"
import { startSourceIngest } from "src/lib/ingest-client"
import { titleFromFilename } from "src/lib/source_title"
import type { UploadingSource } from "src/lib/uploading_sources"

export type UploadSourceFilesArgs = {
	files: File[]
	notebookId: Id<"notebooks">
	sourceCount: number
	generateUploadUrl: () => Promise<string>
	onPending?: (pending: UploadingSource[]) => void
	onCreated?: (localId: string, sourceId: Id<"sources">) => void
	onFailed?: (localId: string) => void
}

export async function uploadSourceFiles({
	files,
	notebookId,
	sourceCount,
	generateUploadUrl,
	onPending,
	onCreated,
	onFailed,
}: UploadSourceFilesArgs) {
	const remaining = Math.max(0, 20 - sourceCount)
	const accepted: File[] = []
	const rejected: string[] = []

	for (const file of files) {
		if (accepted.length >= remaining) {
			rejected.push(`${file.name} exceeds the 20-source limit.`)
			continue
		}

		if (file.size > 20 * 1024 * 1024) {
			rejected.push(`${file.name} exceeds the 20MB upload limit.`)
			continue
		}

		if (!isAcceptedUpload(file.name, file.type)) {
			rejected.push(describeRejectedFile(file.name))
			continue
		}

		accepted.push(file)
	}

	const pending = accepted.map(
		(file): UploadingSource => ({
			localId: nanoid(),
			filename: file.name,
			title: titleFromFilename(file.name),
		}),
	)

	if (pending.length) {
		onPending?.(pending)
	}

	for (const [index, file] of accepted.entries()) {
		const localId = pending[index]?.localId

		try {
			const uploadUrl = await generateUploadUrl()
			const response = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": file.type || "application/octet-stream" },
				body: file,
			})

			if (!response.ok) {
				throw new Error(`Upload failed for ${file.name}.`)
			}

			const { storageId } = (await response.json()) as {
				storageId: Id<"_storage">
			}
			const sourceId = await startSourceIngest({
				action: "create",
				kind: "file",
				notebookId,
				storageId,
				filename: file.name,
				mimeType: file.type || undefined,
			})
			onCreated?.(localId, sourceId)
		} catch (error) {
			onFailed?.(localId)

			for (const leftover of pending.slice(index + 1)) {
				onFailed?.(leftover.localId)
			}

			throw error
		}
	}

	return rejected.length
		? `Some files were skipped: ${rejected.slice(0, 3).join(" ")}`
		: null
}
