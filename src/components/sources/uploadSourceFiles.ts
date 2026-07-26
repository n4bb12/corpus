import type { Id } from "src/convex/_generated/dataModel"
import { describeRejectedFile, isAcceptedUpload } from "src/lib/file_types"
import { startSourceIngest } from "src/lib/ingest-client"

export type UploadSourceFilesArgs = {
	files: File[]
	notebookId: Id<"notebooks">
	sourceCount: number
	generateUploadUrl: () => Promise<string>
}

export async function uploadSourceFiles({
	files,
	notebookId,
	sourceCount,
	generateUploadUrl,
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

	for (const file of accepted) {
		const uploadUrl = await generateUploadUrl()
		const response = await fetch(uploadUrl, {
			method: "POST",
			headers: { "Content-Type": file.type || "application/octet-stream" },
			body: file,
		})
		const { storageId } = (await response.json()) as {
			storageId: Id<"_storage">
		}
		await startSourceIngest({
			action: "create",
			kind: "file",
			notebookId,
			storageId,
			filename: file.name,
			mimeType: file.type || undefined,
		})
	}

	return rejected.length
		? `Some files were skipped: ${rejected.slice(0, 3).join(" ")}`
		: null
}
