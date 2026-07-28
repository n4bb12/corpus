"use client"

import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { useRouter, useSearchParams } from "next/navigation"
import { startTransition, useEffect, useRef, useState } from "react"
import { api } from "src/convex/_generated/api"
import { normalizeTitle } from "src/lib/sourceTitle"
import { useDebouncedValue } from "src/lib/useDebouncedValue"
import { useAuthUser, useSignedInQueryArgs } from "src/lib/useSignedIn"

const SEARCH_DEBOUNCE_MS = 100

function parsePage(value: string | null) {
  if (!value) {
    return undefined
  }

  const page = Number(value)

  if (!Number.isInteger(page) || page < 1) {
    return undefined
  }

  return page
}

export function useLibraryPageData() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchQ = searchParams?.get("q") ?? undefined
  const searchPage = parsePage(searchParams?.get("page") ?? null)
  const [draft, setDraft] = useState(searchQ ?? "")
  const [debouncedDraft, setDebouncedDraft] = useDebouncedValue(
    draft,
    SEARCH_DEBOUNCE_MS,
  )
  const searchTerm = debouncedDraft.trim()
  const typing = draft !== debouncedDraft
  const lastWrittenQ = useRef(searchQ ?? "")
  const createNotebook = useMutation(api.notebooks.create)
  const removeNotebook = useMutation(api.notebooks.remove)
  const renameNotebook = useMutation(api.notebooks.rename).withOptimisticUpdate(
    (localStore, args) => {
      const title = normalizeTitle(args.title, "")
      const titlePatch = {
        title,
        titleOrigin: title ? ("manual" as const) : ("placeholder" as const),
        titleGenerationState: title
          ? ("complete" as const)
          : ("pending" as const),
      }

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
              ? { ...notebook, ...titlePatch }
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
          { ...current, ...titlePatch },
        )
      }
    },
  )
  const user = useAuthUser()
  const [creating, setCreating] = useState(false)
  const [creatingNotebookId, setCreatingNotebookId] = useState<string>()
  const pageIndex =
    searchTerm === (searchQ ?? "").trim() ? (searchPage ?? 1) : 1

  useEffect(() => {
    const urlQ = searchQ ?? ""

    if (urlQ === lastWrittenQ.current) {
      return
    }

    lastWrittenQ.current = urlQ
    setDraft(urlQ)
    setDebouncedDraft(urlQ)
  }, [searchQ, setDebouncedDraft])

  useEffect(() => {
    if ((searchQ ?? "") === debouncedDraft) {
      return
    }

    lastWrittenQ.current = debouncedDraft
    const params = new URLSearchParams()

    if (debouncedDraft) {
      params.set("q", debouncedDraft)
    }

    const query = params.toString()
    router.replace(query ? `/library?${query}` : "/library")
  }, [debouncedDraft, router, searchQ])

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
  // Keep no-match from the last published display so skipping the query while
  // typing does not blank the results pane.
  const noMatches =
    hasResolvedOnce.current && !!displaySearchTerm && !page.length
  const currentPage = displayResult?.pageIndex ?? pageIndex
  const pageCount = displayResult?.pageCount ?? 0
  const showPagination = !isInitialLoading && pageCount > 1
  const showSearch =
    showPagination ||
    !!draft ||
    !!searchQ ||
    !!displaySearchTerm ||
    pageIndex > 1

  async function onCreate() {
    setCreating(true)

    try {
      const notebookId = await createNotebook({})
      setCreatingNotebookId(notebookId)
      await router.push(`/notebooks/${notebookId}?tab=sources`)
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
      router.replace("/library")
    })
  }

  function goToPage(nextPage: number) {
    startTransition(() => {
      const params = new URLSearchParams()

      if (searchQ) {
        params.set("q", searchQ)
      }

      if (nextPage > 1) {
        params.set("page", String(nextPage))
      }

      const query = params.toString()
      router.replace(query ? `/library?${query}` : "/library")
    })
  }

  return {
    user,
    draft,
    setDraft,
    creating,
    searchTerm: displaySearchTerm,
    page,
    currentPage,
    pageCount,
    isLoading: isInitialLoading,
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
