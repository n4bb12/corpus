import { Upload } from "lucide-react"
import type { RefObject } from "react"

export type AddSourceFileDropzoneProps = {
	fileRef: RefObject<HTMLInputElement | null>
	onFiles: (files: File[]) => Promise<void>
}

export function AddSourceFileDropzone({
	fileRef,
	onFiles,
}: AddSourceFileDropzoneProps) {
	return (
		<>
			<button
				type="button"
				className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5"
				onClick={() => fileRef.current?.click()}
				onDragOver={(event) => event.preventDefault()}
				onDrop={async (event) => {
					event.preventDefault()
					const files = [...event.dataTransfer.files]

					if (!files.length) {
						return
					}

					await onFiles(files)
				}}
			>
				<Upload size={22} />
				Drop files here or choose files
			</button>
			<input
				ref={fileRef}
				type="file"
				multiple
				className="hidden"
				onChange={async (event) => {
					const files = [...(event.target.files ?? [])]

					if (!files.length) {
						return
					}

					await onFiles(files)
					event.target.value = ""
				}}
			/>
		</>
	)
}
