import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { useEffect, useState } from "react"
import { api } from "src/convex/_generated/api"
import { authClient } from "src/lib/auth-client"
import { LIMITS } from "src/lib/limits"
import { normalizeTitle } from "src/lib/source_title"
import { useSignedInQueryArgs } from "src/lib/use-signed-in"

const routeApi = getRouteApi("/")

export function useLibraryPage() {
	const navigate = useNavigate()
	const search = routeApi.useSearch()
	const [draft, setDraft] = useState(search.q ?? "")
	const createNotebook = useMutation(api.notebooks.create)
	const removeNotebook = useMutation(api.notebooks.remove)
	const renameNotebook = useMutation(api.notebooks.rename).withOptimisticUpdate(
		(localStore, args) => {
			const title = normalizeTitle(args.title, "")

			for (const { args: queryArgs, value } of localStore.getAllQueries(
				api.notebooks.list,
			)) {
				if (!value) {
					continue
				}

				localStore.setQuery(api.notebooks.list, queryArgs, {
					...value,
					page: value.page.map((notebook) =>
						notebook._id === args.notebookId
							? { ...notebook, title }
							: notebook,
					),
				})
			}

			const current = localStore.getQuery(api.notebooks.get, {
				notebookId: args.notebookId,
			})

			if (current) {
				localStore.setQuery(
					api.notebooks.get,
					{ notebookId: args.notebookId },
					{ ...current, title },
				)
			}
		},
	)
	const session = authClient.useSession()
	const [creating, setCreating] = useState(false)
	const [creatingNotebookId, setCreatingNotebookId] = useState<string>()

	useEffect(() => {
		const handle = window.setTimeout(() => {
			if ((search.q ?? "") === draft) {
				return
			}

			void navigate({
				to: "/",
				search: {
					q: draft || undefined,
					cursor: undefined,
				},
			})
		}, 250)

		return () => window.clearTimeout(handle)
	}, [draft, navigate, search.q])

	const result = useQuery(
		api.notebooks.list,
		useSignedInQueryArgs({
			search: search.q || undefined,
			cursor: search.cursor,
			limit: LIMITS.libraryPageSize,
		}),
	)

	const isLoading = result === undefined
	const page = (result?.page ?? []).filter(
		(notebook) => notebook._id !== creatingNotebookId,
	)
	const isEmpty = !isLoading && !search.q && !page.length
	const noMatches = !isLoading && !!search.q && !page.length
	const showPagination =
		!isLoading && (!!search.cursor || (result !== undefined && !result.isDone))
	const showSearch = showPagination || !!search.q || !!search.cursor

	async function onCreate() {
		setCreating(true)

		try {
			const notebookId = await createNotebook({})
			setCreatingNotebookId(notebookId)
			await navigate({
				to: "/notebooks/$notebookId",
				params: { notebookId },
				search: { tab: "sources" },
			})
		} catch {
			setCreatingNotebookId(undefined)
			setCreating(false)
		}
	}

	function clearSearch() {
		setDraft("")
		void navigate({ to: "/", search: {} })
	}

	return {
		session,
		draft,
		setDraft,
		creating,
		search,
		result,
		page,
		isLoading,
		isEmpty,
		noMatches,
		showPagination,
		showSearch,
		navigate,
		onCreate,
		clearSearch,
		renameNotebook,
		removeNotebook,
	}
}
