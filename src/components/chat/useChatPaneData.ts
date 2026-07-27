import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { useEffect, useRef, useState } from "react"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { formatChatError } from "src/lib/chatErrors"
import {
  canRetryLatestAssistant,
  getOptimisticUserPrompt,
  type OptimisticChatSubmission,
} from "src/lib/chatHistory"
import { consumeChatSse, type StreamCitation } from "src/lib/chatSse"
import { useHasPendingSources } from "src/lib/pendingSources"
import { useSignedInQueryArgs } from "src/lib/useSignedIn"

export function useChatPaneData(notebookId: Id<"notebooks">) {
  const notebookArgs = useSignedInQueryArgs({ notebookId })
  const entries = useQuery(api.chat.list, notebookArgs)
  const sources = useQuery(api.sources.listByNotebook, notebookArgs)
  const clearChat = useMutation(api.notebooks.clearChat)
  const cancelGeneration = useMutation(api.chat.cancelGeneration)
  const failActiveGeneration = useMutation(api.chat.failActiveGeneration)
  const [prompt, setPrompt] = useState("")
  const [sending, setSending] = useState(false)
  const [optimisticSubmission, setOptimisticSubmission] =
    useState<OptimisticChatSubmission | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamedContent, setStreamedContent] = useState<string | null>(null)
  const [streamedCitations, setStreamedCitations] = useState<StreamCitation[]>(
    [],
  )
  const [streamedInsufficient, setStreamedInsufficient] = useState<
    boolean | null
  >(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const abortRef = useRef<AbortController | null>(null)
  const acceptingStreamRef = useRef(false)
  const streamedContentRef = useRef<string | null>(null)

  const hasPendingSources = useHasPendingSources(notebookId)

  const readySelected =
    sources?.filter(
      (source) => source.selected && source.processingState === "ready",
    ) ?? []

  const hasSources = !!sources?.length
  const hasSelectedProcessing =
    sources?.some(
      (source) =>
        source.selected &&
        source.processingState !== "ready" &&
        source.processingState !== "failed",
    ) ?? false

  const emptyPromptState = readySelected.length
    ? ("ready" as const)
    : hasSelectedProcessing || hasPendingSources
      ? ("processing" as const)
      : hasSources
        ? ("select" as const)
        : ("empty" as const)

  const streaming = entries?.some(
    (entry) =>
      entry.kind === "message" &&
      entry.role === "assistant" &&
      (entry.status === "pending" || entry.status === "streaming"),
  )

  const canRetry = entries ? canRetryLatestAssistant(entries) : false
  const optimisticUserPrompt = getOptimisticUserPrompt(
    entries,
    optimisticSubmission,
  )

  useEffect(() => {
    if (!entries?.length && !streamedContent) {
      return
    }

    if (!stickToBottom.current || !scrollerRef.current) {
      return
    }

    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
  }, [entries, streamedContent])

  async function markFailed(message: string) {
    setError(message)

    try {
      await failActiveGeneration({
        notebookId,
        errorMessage: message,
      })
    } catch {
      // Thread status may already be finalized by the server.
    }
  }

  async function send(nextPrompt = prompt, retryAssistantId?: string) {
    if (!nextPrompt.trim() || !readySelected.length) {
      return
    }

    setSending(true)
    setError(null)
    setStreamedContent(null)
    streamedContentRef.current = null
    setStreamedCitations([])
    setStreamedInsufficient(null)

    if (!retryAssistantId) {
      setOptimisticSubmission({
        content: nextPrompt,
        existingMessageCount:
          entries?.filter((entry) => entry.kind === "message").length ?? 0,
      })
    }

    const controller = new AbortController()
    abortRef.current = controller
    acceptingStreamRef.current = true

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebookId,
          prompt: nextPrompt,
          retryAssistantId,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        let message = "Couldn't start the answer. Try again."

        try {
          const payload = JSON.parse(text) as { error?: string }
          message = payload.error || text || message
        } catch {
          if (text.trim()) {
            message = text
          }
        }

        throw new Error(message)
      }

      setPrompt("")
      const result = await consumeChatSse(response, {
        signal: controller.signal,
        shouldAccept: () => acceptingStreamRef.current,
        onText: (text) => {
          if (!acceptingStreamRef.current) {
            return
          }

          streamedContentRef.current = text
          setStreamedContent(text)
        },
        onCitations: (citations) => {
          if (!acceptingStreamRef.current) {
            return
          }

          setStreamedCitations(citations)
        },
        onInsufficient: (insufficient) => {
          if (!acceptingStreamRef.current) {
            return
          }

          setStreamedInsufficient(insufficient)
        },
      })

      if (result.canceled || controller.signal.aborted) {
        return
      }

      if (result.error) {
        await markFailed(formatChatError(result.error))
        return
      }

      if (!result.done) {
        await markFailed("The answer stopped before it finished. Try again.")
      }
    } catch (err) {
      if ((err as Error).name === "AbortError" || controller.signal.aborted) {
        return
      }

      await markFailed(formatChatError(err))
    } finally {
      acceptingStreamRef.current = false
      setSending(false)
      setOptimisticSubmission(null)
      abortRef.current = null
    }
  }

  async function stop() {
    acceptingStreamRef.current = false
    abortRef.current?.abort()
    abortRef.current = null

    try {
      await cancelGeneration({
        notebookId,
        content: streamedContentRef.current ?? undefined,
      })
    } catch {
      // Server may already have finalized the turn.
    }
  }

  return {
    entries,
    prompt,
    setPrompt,
    sending,
    clearOpen,
    setClearOpen,
    error,
    scrollerRef,
    stickToBottom,
    readySelected,
    emptyPromptState,
    streaming,
    streamedContent,
    streamedCitations,
    streamedInsufficient,
    canRetry,
    optimisticUserPrompt,
    send,
    stop,
    clearChat,
  }
}
