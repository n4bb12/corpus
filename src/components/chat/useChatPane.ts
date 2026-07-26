import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { useEffect, useRef, useState } from "react"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { formatChatError } from "src/lib/chat_errors"
import {
	canRetryLatestAssistant,
	getOptimisticUserPrompt,
	type OptimisticChatSubmission,
} from "src/lib/chat_history"
import { consumeChatSse, type StreamCitation } from "src/lib/chat_sse"
import { useSignedInQueryArgs } from "src/lib/use-signed-in"

export function useChatPane(notebookId: Id<"notebooks">) {
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
	const scrollerRef = useRef<HTMLDivElement>(null)
	const stickToBottom = useRef(true)
	const abortRef = useRef<AbortController | null>(null)

	const readySelected =
		sources?.filter(
			(source) => source.selected && source.processingState === "ready",
		) ?? []

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
		setStreamedCitations([])

		if (!retryAssistantId) {
			setOptimisticSubmission({
				content: nextPrompt,
				existingMessageCount:
					entries?.filter((entry) => entry.kind === "message").length ?? 0,
			})
		}

		const controller = new AbortController()
		abortRef.current = controller

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
				const payload = (await response.json().catch(() => null)) as {
					error?: string
				} | null
				throw new Error(
					payload?.error || "Couldn't start the answer. Try again.",
				)
			}

			setPrompt("")
			const result = await consumeChatSse(response, {
				onText: setStreamedContent,
				onCitations: setStreamedCitations,
			})

			if (result.error) {
				await markFailed(formatChatError(result.error))
				return
			}

			if (!result.done) {
				await markFailed("The answer stopped before it finished. Try again.")
			}
		} catch (err) {
			if ((err as Error).name === "AbortError") {
				return
			}

			await markFailed(formatChatError(err))
		} finally {
			setSending(false)
			setOptimisticSubmission(null)
			abortRef.current = null
		}
	}

	async function stop() {
		abortRef.current?.abort()
		await cancelGeneration({ notebookId })
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
		streaming,
		streamedContent,
		streamedCitations,
		canRetry,
		optimisticUserPrompt,
		send,
		stop,
		clearChat,
	}
}
