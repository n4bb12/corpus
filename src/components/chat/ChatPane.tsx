import { useConvexAuth, useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { useEffect, useRef, useState } from "react"
import { ChatComposer } from "src/components/chat/ChatComposer"
import {
	type ChatCiteArgs,
	ChatMessageList,
} from "src/components/chat/ChatMessageList"
import { ClearChatDialog } from "src/components/chat/ClearChatDialog"
import { Button } from "src/components/ui/button"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { canRetryLatestAssistant } from "src/lib/chat_history"

export type ChatPaneProps = {
	notebookId: Id<"notebooks">
	onOpenSources: () => void
	onAddSource: () => void
	onCite: (args: ChatCiteArgs) => void
}

export function ChatPane({
	notebookId,
	onOpenSources,
	onAddSource,
	onCite,
}: ChatPaneProps) {
	const { isAuthenticated } = useConvexAuth()
	const entries = useQuery(
		api.chat.list,
		isAuthenticated ? { notebookId } : "skip",
	)
	const sources = useQuery(
		api.sources.listByNotebook,
		isAuthenticated ? { notebookId } : "skip",
	)
	const clearChat = useMutation(api.notebooks.clearChat)
	const cancelGeneration = useMutation(api.chat.cancelGeneration)
	const [prompt, setPrompt] = useState("")
	const [sending, setSending] = useState(false)
	const [clearOpen, setClearOpen] = useState(false)
	const [error, setError] = useState<string | null>(null)
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

	useEffect(() => {
		if (!stickToBottom.current || !scrollerRef.current) {
			return
		}

		scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
	}, [])

	async function send(nextPrompt = prompt, retryAssistantId?: string) {
		if (!nextPrompt.trim() || !readySelected.length) {
			return
		}

		setSending(true)
		setError(null)
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
				throw new Error(payload?.error || "Chat request failed.")
			}

			setPrompt("")
			const reader = response.body?.getReader()

			if (reader) {
				while (true) {
					const { done } = await reader.read()

					if (done) {
						break
					}
				}
			}
		} catch (err) {
			if ((err as Error).name !== "AbortError") {
				setError(err instanceof Error ? err.message : "Chat failed.")
			}
		} finally {
			setSending(false)
			abortRef.current = null
		}
	}

	async function stop() {
		abortRef.current?.abort()
		await cancelGeneration({ notebookId })
	}

	return (
		<div className="flex h-full min-w-0 flex-col">
			<div className="flex items-center justify-end px-4 pt-3">
				<Button
					variant="ghost"
					size="sm"
					className="rounded-sm"
					onClick={() => setClearOpen(true)}
				>
					Clear chat
				</Button>
			</div>

			<div
				ref={scrollerRef}
				className="flex-1 overflow-auto px-4"
				onScroll={(event) => {
					const node = event.currentTarget
					stickToBottom.current =
						node.scrollHeight - node.scrollTop - node.clientHeight < 80
				}}
			>
				<ChatMessageList
					entries={entries}
					readySelectedCount={readySelected.length}
					canRetry={canRetry}
					onAddSource={onAddSource}
					onCite={onCite}
					onSendSuggestion={(suggestion) => void send(suggestion)}
					onRetry={(nextPrompt, assistantId) =>
						void send(nextPrompt, assistantId)
					}
				/>
			</div>

			<ChatComposer
				prompt={prompt}
				error={error}
				readySourceCount={readySelected.length}
				sending={sending}
				streaming={!!streaming}
				onPromptChange={setPrompt}
				onSend={() => void send()}
				onStop={() => void stop()}
				onOpenSources={onOpenSources}
			/>

			<ClearChatDialog
				open={clearOpen}
				onOpenChange={setClearOpen}
				onConfirm={async () => {
					await clearChat({ notebookId })
					setClearOpen(false)
				}}
			/>
		</div>
	)
}
