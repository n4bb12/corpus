import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { startTransition, useEffect, useRef, useState } from "react"
import { api } from "src/convex/_generated/api"
import { authClient } from "src/lib/authClient"
import { normalizeTitle } from "src/lib/sourceTitle"
import { useSignedInQueryArgs } from "src/lib/useSignedIn"

const routeApi = getRouteApi("/")

export function useLibraryPageData() {
  const navigate = useNavigate()
  const search = routeApi.useSearch()
  const [draft, setDraft] = useState(search.q ?? "")
  const searchTerm = (search.q ?? "").trim()
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
  const pageIndex = search.page ?? 1

  useEffect(() => {
    setDraft(search.q ?? "")
  }, [search.q])

  useEffect(() => {
    if ((search.q ?? "") === draft) {
      return
    }

    const handle = window.setTimeout(() => {
      startTransition(() => {
        void navigate({
          to: "/",
          search: {
            q: draft || undefined,
            page: undefined,
          },
        })
      })
    }, 200)

    return () => window.clearTimeout(handle)
  }, [draft, navigate, search.q])

  const result = useQuery(
    api.notebooks.list,
    useSignedInQueryArgs({
      search: searchTerm || undefined,
      page: pageIndex,
    }),
  )
  const cachedResult = useRef<NonNullable<typeof result> | null>(null)

  if (result !== undefined) {
    cachedResult.current = result
  }

  const displayResult = result ?? cachedResult.current
  const isInitialLoading = displayResult === undefined
  const page = (displayResult?.page ?? []).filter(
    (notebook) => notebook._id !== creatingNotebookId,
  )
  const isEmpty = !isInitialLoading && !searchTerm && !page.length
  const noMatches = result !== undefined && !!searchTerm && !result.page.length
  const currentPage = displayResult?.pageIndex ?? pageIndex
  const pageCount = displayResult?.pageCount ?? 0
  const showPagination = !isInitialLoading && pageCount > 1
  const showSearch = showPagination || !!draft || !!search.q || pageIndex > 1

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
    startTransition(() => {
      void navigate({ to: "/", search: {} })
    })
  }

  function goToPage(nextPage: number) {
    startTransition(() => {
      void navigate({
        to: "/",
        search: {
          q: search.q,
          page: nextPage > 1 ? nextPage : undefined,
        },
      })
    })
  }

  return {
    session,
    draft,
    setDraft,
    creating,
    searchTerm,
    page,
    currentPage,
    pageCount,
    isLoading: isInitialLoading,
    isEmpty,
    noMatches,
    showPagination,
    showSearch,
    onCreate,
    clearSearch,
    goToPage,
    renameNotebook,
    removeNotebook,
  }
}
