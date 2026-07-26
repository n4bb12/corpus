import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { useMemo, useRef, useState } from "react"
import { uploadSourceFiles } from "src/components/sources/uploadSourceFiles"
import { useSourcePreviewMarkdown } from "src/components/sources/useSourcePreviewMarkdown"
import { api } from "src/convex/_generated/api"
import type { Doc, Id } from "src/convex/_generated/dataModel"
import { useSignedInQueryArgs } from "src/lib/use-signed-in"

export function useSourcesPane({
	notebookId,
	previewSourceId,
	addOpenControlled,
	onAddOpenChange,
}: {
	notebookId: Id<"notebooks">
	previewSourceId?: string | null
	addOpenControlled?: boolean
	onAddOpenChange?: (open: boolean) => void
}) {
	const sources = useQuery(
		api.sources.listByNotebook,
		useSignedInQueryArgs({ notebookId }),
	)
	const setSelected = useMutation(api.sources.setSelected)
	const setSelectedMany = useMutation(api.sources.setSelectedMany)
	const renameSource = useMutation(api.sources.rename)
	const removeSource = useMutation(api.sources.remove)
	const generateUploadUrl = useMutation(api.sources.generateUploadUrl)
	const [query, setQuery] = useState("")
	const [addOpenUncontrolled, setAddOpenUncontrolled] = useState(false)
	const addOpen = addOpenControlled ?? addOpenUncontrolled
	const setAddOpen = onAddOpenChange ?? setAddOpenUncontrolled
	const [dragging, setDragging] = useState(false)
	const [renameId, setRenameId] = useState<Id<"sources"> | null>(null)
	const [renameDraft, setRenameDraft] = useState("")
	const [deleteId, setDeleteId] = useState<Id<"sources"> | null>(null)
	const [uploadNotice, setUploadNotice] = useState<string | null>(null)
	const listRef = useRef<HTMLDivElement>(null)
	const scrollMemory = useRef(0)
	const previewMarkdown = useSourcePreviewMarkdown(previewSourceId)

	const filtered = useMemo(() => {
		const list = sources ?? []
		const showSearch = list.length >= 6
		const needle = showSearch ? query.trim().toLowerCase() : ""

		if (!needle) {
			return list
		}

		return list.filter((source) => source.title.toLowerCase().includes(needle))
	}, [query, sources])

	const selectable = filtered.filter(
		(source) => source.processingState !== "failed",
	)
	const selectedCount = selectable.filter((source) => source.selected).length
	const allSelected =
		selectable.length > 0 && selectedCount === selectable.length
	const someSelected = selectedCount > 0 && !allSelected
	const previewSource = sources?.find(
		(source) => source._id === previewSourceId,
	)

	async function uploadFiles(files: File[]) {
		const notice = await uploadSourceFiles({
			files,
			notebookId,
			sourceCount: sources?.length ?? 0,
			generateUploadUrl: async () => generateUploadUrl({}),
		})
		setUploadNotice(notice)
	}

	function beginRename(source: Doc<"sources">) {
		setRenameId(source._id)
		setRenameDraft(source.title)
	}

	async function saveRename() {
		if (!renameId) {
			return
		}

		await renameSource({ sourceId: renameId, title: renameDraft })
		setRenameId(null)
	}

	async function confirmDelete() {
		if (!deleteId) {
			return
		}

		await removeSource({ sourceId: deleteId })
		setDeleteId(null)
	}

	return {
		sources,
		query,
		setQuery,
		addOpen,
		setAddOpen,
		dragging,
		setDragging,
		renameId,
		setRenameId,
		renameDraft,
		setRenameDraft,
		deleteId,
		setDeleteId,
		uploadNotice,
		listRef,
		scrollMemory,
		previewMarkdown,
		filtered,
		selectable,
		selectedCount,
		allSelected,
		someSelected,
		previewSource,
		uploadFiles,
		beginRename,
		saveRename,
		confirmDelete,
		setSelected,
		setSelectedMany,
	}
}
