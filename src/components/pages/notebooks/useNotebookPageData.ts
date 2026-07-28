"use client"

import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { normalizeTitle } from "src/lib/sourceTitle"
import {
  useAuthUser,
  useIsSignedIn,
  useSignedInQueryArgs,
} from "src/lib/useSignedIn"

function notebookHref(notebookId: string, tab: "sources" | "chat") {
  return `/notebooks/${notebookId}?tab=${tab}`
}

export function useNotebookPageData() {
  const params = useParams<{ notebookId: string }>()
  const notebookId =
    typeof params?.notebookId === "string" ? params.notebookId : ""
  const searchParams = useSearchParams()
  const searchTab = searchParams?.get("tab")
  const tab =
    searchTab === "sources" || searchTab === "chat" ? searchTab : undefined
  const router = useRouter()
  const isSignedIn = useIsSignedIn()
  const user = useAuthUser()
  const notebookArgs = useSignedInQueryArgs(
    notebookId ? { notebookId: notebookId as Id<"notebooks"> } : "skip",
  )
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
    if (!isSignedIn || !notebookId) {
      return
    }

    void touch({ notebookId: notebookId as Id<"notebooks"> })
  }, [isSignedIn, notebookId, touch])

  useEffect(() => {
    if (!notebookId || tab) {
      return
    }

    const hasSources = (sources?.length ?? 0) > 0
    router.replace(notebookHref(notebookId, hasSources ? "chat" : "sources"))
  }, [notebookId, router, sources?.length, tab])

  const resolvedTab: "sources" | "chat" = tab ?? "sources"

  function setTab(next: "sources" | "chat") {
    if (!notebookId) {
      return
    }

    router.push(notebookHref(notebookId, next))
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
    tab: resolvedTab,
    setTab,
  }
}
