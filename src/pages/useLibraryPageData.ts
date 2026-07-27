import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { startTransition, useEffect, useRef, useState } from "react"
import { api } from "src/convex/_generated/api"
import { authClient } from "src/lib/authClient"
import { normalizeTitle } from "src/lib/sourceTitle"
import { useDebouncedValue } from "src/lib/useDebouncedValue"
import { useSignedInQueryArgs } from "src/lib/useSignedIn"

const routeApi = getRouteApi("/")
const SEARCH_DEBOUNCE_MS = 100

export function useLibraryPageData() {
  const navigate = useNavigate()
  const search = routeApi.useSearch()
  const [draft, setDraft] = useState(search.q ?? "")
  const [debouncedDraft, setDebouncedDraft] = useDebouncedValue(
    draft,
    SEARCH_DEBOUNCE_MS,
  )
  const searchTerm = debouncedDraft.trim()
  const typing = draft !== debouncedDraft
  const lastWrittenQ = useRef(search.q ?? "")
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
  const pageIndex =
    searchTerm === (search.q ?? "").trim() ? (search.page ?? 1) : 1

  useEffect(() => {
    const urlQ = search.q ?? ""

    if (urlQ === lastWrittenQ.current) {
      return
    }

    lastWrittenQ.current = urlQ
    setDraft(urlQ)
    setDebouncedDraft(urlQ)
  }, [search.q, setDebouncedDraft])

  useEffect(() => {
    if ((search.q ?? "") === debouncedDraft) {
      return
    }

    lastWrittenQ.current = debouncedDraft
    void navigate({
      to: "/",
      search: {
        q: debouncedDraft || undefined,
        page: undefined,
      },
    })
  }, [debouncedDraft, navigate, search.q])

  const listArgs = searchTerm
    ? { search: searchTerm, page: pageIndex }
    : { page: pageIndex }
  // While the draft is ahead of the debounce, drop the prior list subscription so
  // an in-flight search cannot finish after the user has already moved on.
  const result = useQuery(
    api.notebooks.list,
    useSignedInQueryArgs(typing ? "skip" : listArgs),
  )
  const displayRef = useRef<{
    searchTerm: string
    result: NonNullable<typeof result>
  } | null>(null)
  const hasResolvedOnce = useRef(false)

  // Publish search term + results together so the grid does not restyle (hero →
  // search) on the debounce tick and then reshuffle again when data arrives.
  if (!typing && result !== undefined) {
    hasResolvedOnce.current = true
    displayRef.current = { searchTerm, result }
  }

  const display = displayRef.current
  const isInitialLoading = !hasResolvedOnce.current
  const displaySearchTerm = display?.searchTerm ?? ""
  const displayResult = display?.result
  const page = (displayResult?.page ?? []).filter(
    (notebook) => notebook._id !== creatingNotebookId,
  )
  // Keep empty / no-match from the last published display so skipping the query
  // while typing does not blank the results pane.
  const isEmpty =
    hasResolvedOnce.current && !displaySearchTerm && !page.length
  const noMatches =
    hasResolvedOnce.current && !!displaySearchTerm && !page.length
  const currentPage = displayResult?.pageIndex ?? pageIndex
  const pageCount = displayResult?.pageCount ?? 0
  const showPagination = !isInitialLoading && pageCount > 1
  const showSearch =
    showPagination ||
    !!draft ||
    !!search.q ||
    !!displaySearchTerm ||
    pageIndex > 1

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
    lastWrittenQ.current = ""
    setDraft("")
    setDebouncedDraft("")
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
    searchTerm: displaySearchTerm,
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
