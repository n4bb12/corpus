import type { OptimisticLocalStore } from "convex/browser"
import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { useEffect, useMemo, useRef, useState } from "react"
import { uploadSourceFiles } from "src/components/sources/uploadSourceFiles"
import { useSourcePreviewMarkdown } from "src/components/sources/useSourcePreviewMarkdown"
import { api } from "src/convex/_generated/api"
import type { Doc, Id } from "src/convex/_generated/dataModel"
import { startSourceIngest } from "src/lib/ingest-client"
import { patchChatEntriesForSourceSelection } from "src/lib/optimistic_source_boundary"
import {
	markUploadingSourceCreated,
	removeUploadingSource,
	type UploadingSource,
	visibleUploadingSources,
} from "src/lib/uploading_sources"
import { useEventCallback } from "src/lib/use-event-callback"
import { useSignedInQueryArgs } from "src/lib/use-signed-in"

function patchSourceSelected(
	sources: Doc<"sources">[],
	sourceId: Id<"sources">,
	selected: boolean,
) {
	return sources.map((source) =>
		source._id === sourceId ? { ...source, selected } : source,
	)
}

function patchSourcesSelectedMany(
	sources: Doc<"sources">[],
	sourceIds: Id<"sources">[],
	selected: boolean,
) {
	const idSet = new Set(sourceIds)

	return sources.map((source) => {
		if (!idSet.has(source._id) || source.processingState === "failed") {
			return source
		}

		return source.selected === selected ? source : { ...source, selected }
	})
}

function syncOptimisticChatBoundary(
	localStore: OptimisticLocalStore,
	notebookId: Id<"notebooks">,
	previousSources: Doc<"sources">[],
	nextSources: Doc<"sources">[],
) {
	const notebook = localStore.getQuery(api.notebooks.get, { notebookId })
	const entries = localStore.getQuery(api.chat.list, { notebookId })

	if (!notebook || !entries) {
		return
	}

	localStore.setQuery(
		api.chat.list,
		{ notebookId },
		patchChatEntriesForSourceSelection({
			entries,
			previousSources,
			nextSources,
			chatSelectionHash: notebook.chatSelectionHash,
			notebookId,
			chatEpoch: notebook.chatEpoch,
		}),
	)
}

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
	const setSelected = useMutation(api.sources.setSelected).withOptimisticUpdate(
		(localStore, args) => {
			for (const { args: queryArgs, value } of localStore.getAllQueries(
				api.sources.listByNotebook,
			)) {
				if (!value) {
					continue
				}

				const source = value.find((entry) => entry._id === args.sourceId)

				if (!source) {
					continue
				}

				const nextSources = patchSourceSelected(
					value,
					args.sourceId,
					args.selected,
				)

				localStore.setQuery(api.sources.listByNotebook, queryArgs, nextSources)

				if (source.processingState !== "ready") {
					continue
				}

				syncOptimisticChatBoundary(
					localStore,
					source.notebookId,
					value,
					nextSources,
				)
			}
		},
	)
	const setSelectedMany = useMutation(
		api.sources.setSelectedMany,
	).withOptimisticUpdate((localStore, args) => {
		for (const { args: queryArgs, value } of localStore.getAllQueries(
			api.sources.listByNotebook,
		)) {
			if (!value || queryArgs.notebookId !== args.notebookId) {
				continue
			}

			const nextSources = patchSourcesSelectedMany(
				value,
				args.sourceIds,
				args.selected,
			)

			localStore.setQuery(api.sources.listByNotebook, queryArgs, nextSources)
			syncOptimisticChatBoundary(
				localStore,
				args.notebookId,
				value,
				nextSources,
			)
		}
	})
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
	const [uploadingSources, setUploadingSources] = useState<UploadingSource[]>(
		[],
	)
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

	const uploading = useMemo(
		() =>
			visibleUploadingSources(
				uploadingSources,
				(sources ?? []).map((source) => source._id),
			),
		[sources, uploadingSources],
	)

	useEffect(() => {
		if (!sources) {
			return
		}

		const sourceIds = new Set(sources.map((source) => source._id))

		setUploadingSources((current) => {
			const next = visibleUploadingSources(current, sourceIds)

			return next.length === current.length ? current : next
		})
	}, [sources])

	const selectable = useMemo(
		() => filtered.filter((source) => source.processingState !== "failed"),
		[filtered],
	)
	const selectedCount = useMemo(
		() => selectable.filter((source) => source.selected).length,
		[selectable],
	)
	const previewSource = sources?.find(
		(source) => source._id === previewSourceId,
	)

	async function uploadFiles(files: File[]) {
		try {
			const notice = await uploadSourceFiles({
				files,
				notebookId,
				sourceCount: (sources?.length ?? 0) + uploadingSources.length,
				generateUploadUrl: async () => generateUploadUrl({}),
				onPending: (pending) => {
					setUploadingSources((current) => [...pending, ...current])
				},
				onCreated: (localId, sourceId) => {
					setUploadingSources((current) =>
						markUploadingSourceCreated(current, localId, sourceId),
					)
				},
				onFailed: (localId) => {
					setUploadingSources((current) =>
						removeUploadingSource(current, localId),
					)
				},
			})
			setUploadNotice(notice)
		} catch (error) {
			setUploadNotice(
				error instanceof Error ? error.message : "Could not upload file.",
			)
		}
	}

	const beginRename = useEventCallback((source: Doc<"sources">) => {
		setRenameId(source._id)
		setRenameDraft(source.title)
	})

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

	const handleSelect = useEventCallback(
		(sourceId: Id<"sources">, selected: boolean) => {
			void setSelected({ sourceId, selected })
		},
	)
	const handleSelectMany = useEventCallback(
		(args: {
			notebookId: Id<"notebooks">
			sourceIds: Id<"sources">[]
			selected: boolean
		}) => {
			void setSelectedMany(args)
		},
	)
	const handleRetry = useEventCallback((sourceId: Id<"sources">) => {
		void startSourceIngest({
			action: "retry",
			sourceId,
		})
	})
	const handleDelete = useEventCallback((sourceId: Id<"sources">) => {
		setDeleteId(sourceId)
	})

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
		uploading,
		listRef,
		scrollMemory,
		previewMarkdown,
		filtered,
		selectable,
		selectedCount,
		previewSource,
		uploadFiles,
		beginRename,
		saveRename,
		confirmDelete,
		handleSelect,
		handleSelectMany,
		handleRetry,
		handleDelete,
	}
}
