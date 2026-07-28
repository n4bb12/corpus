import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { useEffect, useState } from "react"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { normalizeTitle } from "src/lib/sourceTitle"
import {
  useAuthUser,
  useIsSignedIn,
  useSignedInQueryArgs,
} from "src/lib/useSignedIn"

const routeApi = getRouteApi("/notebooks/$notebookId")

export function useNotebookPageData() {
  const { notebookId } = routeApi.useParams()
  const search = routeApi.useSearch()
  const navigate = useNavigate()
  const isSignedIn = useIsSignedIn()
  const user = useAuthUser()
  const notebookArgs = useSignedInQueryArgs({
    notebookId: notebookId as Id<"notebooks">,
  })
  const notebook = useQuery(api.notebooks.get, notebookArgs)
  const sources = useQuery(api.sources.listByNotebook, notebookArgs)
  const rename = useMutation(api.notebooks.rename).withOptimisticUpdate(
    (localStore, args) => {
      const title = normalizeTitle(args.title, "")
      const current = localStore.getQuery(api.notebooks.get, {
        notebookId: args.notebookId,
      })

      if (current) {
        localStore.setQuery(
          api.notebooks.get,
          { notebookId: args.notebookId },
          {
            ...current,
            title,
            titleOrigin: title ? "manual" : "placeholder",
            titleGenerationState: title ? "complete" : "pending",
          },
        )
      }

      for (const { args: queryArgs, value } of localStore.getAllQueries(
        api.notebooks.list,
      )) {
        if (!value) {
          continue
        }

        localStore.setQuery(api.notebooks.list, queryArgs, {
          ...value,
          page: value.page.map((entry) =>
            entry._id === args.notebookId ? { ...entry, title } : entry,
          ),
        })
      }
    },
  )
  const touch = useMutation(api.notebooks.touch)
  const [previewSourceId, setPreviewSourceId] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<{
    start?: number
    end?: number
    excerpt: string
  } | null>(null)
  const [excerptOnly, setExcerptOnly] = useState<string | null>(null)
  const [addSourceOpen, setAddSourceOpen] = useState(false)

  useEffect(() => {
    if (!isSignedIn) {
      return
    }

    void touch({ notebookId: notebookId as Id<"notebooks"> })
  }, [isSignedIn, notebookId, touch])

  useEffect(() => {
    if (search.tab) {
      return
    }

    const hasSources = (sources?.length ?? 0) > 0
    void navigate({
      to: "/notebooks/$notebookId",
      params: { notebookId },
      search: { tab: hasSources ? "chat" : "sources" },
      replace: true,
    })
  }, [navigate, notebookId, search.tab, sources?.length])

  const tab = search.tab ?? "sources"

  function setTab(next: "sources" | "chat") {
    void navigate({
      to: "/notebooks/$notebookId",
      params: { notebookId },
      search: { tab: next },
    })
  }

  return {
    notebookId,
    user,
    notebook,
    rename,
    previewSourceId,
    setPreviewSourceId,
    highlight,
    setHighlight,
    excerptOnly,
    setExcerptOnly,
    addSourceOpen,
    setAddSourceOpen,
    tab,
    setTab,
  }
}
