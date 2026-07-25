import { Layers, Square } from "lucide-react"
import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { marked } from "marked"
import { useEffect, useRef, useState } from "react"
import { Button } from "src/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "src/components/ui/dialog"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "src/components/ui/popover"
import { Textarea } from "src/components/ui/textarea"
import { LIMITS } from "src/lib/limits"
import { canRetryLatestAssistant } from "src/convex/lib/chat-history"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"

export type ChatPaneProps = {
	notebookId: Id<"notebooks">
	onOpenSources: () => void
	onCite: (args: {
		sourceId?: string
		startOffset?: number
		endOffset?: number
		excerpt: string
		canNavigate: boolean
	}) => void
}

const SUGGESTIONS = [
	"What are the main claims in these sources?",
	"Where do these sources agree or disagree?",
	"Summarize the strongest evidence for the key point.",
]

export function ChatPane({ notebookId, onOpenSources, onCite }: ChatPaneProps) {
	const entries = useQuery(api.chat.list, { notebookId })
	const sources = useQuery(api.sources.listByNotebook, { notebookId })
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
	}, [entries])

	const empty = !entries?.some((entry: any) => entry.kind === "message")

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

	const remaining = LIMITS.maxPromptCharacters - prompt.length

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
				<div className="mx-auto flex min-h-full w-full max-w-[50rem] flex-col gap-6 py-4">
					{empty && readySelected.length ? (
						<div className="space-y-4 pt-8">
							<div>
								<h2 className="text-2xl font-semibold tracking-tight">
									Ask your sources
								</h2>
								<p className="mt-2 max-w-xl text-sm text-muted-foreground">
									Answers stay grounded in the sources you select, with
									citations you can open.
								</p>
							</div>
							<div className="space-y-2">
								{SUGGESTIONS.map((suggestion) => (
									<button
										key={suggestion}
										type="button"
										className="block w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-muted/70"
										onClick={() => void send(suggestion)}
									>
										{suggestion}
									</button>
								))}
							</div>
						</div>
					) : null}

					{empty && !readySelected.length ? (
						<div className="space-y-4 pt-8">
							<h2 className="text-2xl font-semibold tracking-tight">
								Add and select sources
							</h2>
							<p className="max-w-xl text-sm text-muted-foreground">
								Chat needs at least one ready, selected source before it can
								answer.
							</p>
							<Button className="rounded-sm" onClick={onOpenSources}>
								Go to Sources
							</Button>
						</div>
					) : null}

					{(entries ?? []).map((entry: any) => {
						if (entry.kind === "sourceBoundary") {
							return (
								<div
									key={entry._id}
									className="flex flex-col items-center gap-1 py-2"
								>
									<div className="h-px w-full bg-border" />
									<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
										Sources changed
									</p>
									<p className="text-xs text-muted-foreground tabular-nums">
										{entry.activeSourceCount ?? 0} active sources
									</p>
								</div>
							)
						}

						if (entry.role === "user") {
							return (
								<div key={entry._id} className="flex justify-end">
									<div className="max-w-[85%] rounded-2xl bg-card px-4 py-3 shadow-(--shadow-pine)">
										<p className="whitespace-pre-wrap text-sm">
											{entry.content}
										</p>
									</div>
								</div>
							)
						}

						const html = marked.parse(entry.content || "", {
							async: false,
						}) as string
						const latestFailed =
							canRetry &&
							(entry.status === "failed" || entry.status === "canceled")

						return (
							<div key={entry._id} className="space-y-3">
								<div
									className="prose prose-sm dark:prose-invert max-w-none"
									dangerouslySetInnerHTML={{ __html: html }}
								/>
								{entry.citations?.length ? (
									<div className="flex flex-wrap gap-2">
										{entry.citations.map((citation: any, index: number) => (
											<CitationPill
												key={citation._id}
												index={index + 1}
												title={citation.liveTitle}
												excerpt={citation.excerpt}
												canNavigate={citation.canNavigate}
												onOpen={() =>
													onCite({
														sourceId: citation.sourceId,
														startOffset: citation.locator?.startOffset,
														endOffset: citation.locator?.endOffset,
														excerpt: citation.excerpt,
														canNavigate: citation.canNavigate,
													})
												}
											/>
										))}
									</div>
								) : null}
								{entry.status === "failed" && !entry.content ? (
									<p className="text-sm text-destructive">
										{entry.errorMessage || "Generation failed."}
									</p>
								) : null}
								{latestFailed ? (
									<Button
										size="sm"
										variant="outline"
										className="rounded-sm"
										onClick={() => {
											const user = entries?.find(
												(item) =>
													item.kind === "message" &&
													item.role === "user" &&
													item.exchangeId === entry.exchangeId,
											)
											void send(user?.content || "", entry._id)
										}}
									>
										Retry
									</Button>
								) : null}
							</div>
						)
					})}
				</div>
			</div>

			<div className="border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
				<div className="mx-auto w-full max-w-[50rem] space-y-2">
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					<div className="rounded-2xl border border-border bg-card p-3 shadow-(--shadow-pine)">
						<Textarea
							value={prompt}
							onChange={(event) =>
								setPrompt(
									event.target.value.slice(0, LIMITS.maxPromptCharacters),
								)
							}
							onKeyDown={(event) => {
								if (event.key === "Enter" && !event.shiftKey) {
									event.preventDefault()
									void send()
								}
							}}
							placeholder={
								readySelected.length
									? "Ask your sources"
									: "Select ready sources to start chatting"
							}
							disabled={!readySelected.length || sending}
							className="min-h-24 max-h-60 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
						/>
						<div className="mt-2 flex items-center justify-between gap-3">
							<div className="text-xs text-muted-foreground tabular-nums">
								{remaining <= 200 ? `${remaining} left` : null}
							</div>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="rounded-full"
									aria-label={`${readySelected.length} active sources`}
									onClick={onOpenSources}
								>
									<Layers size={16} className="mr-1" />
									{readySelected.length} sources
								</Button>
								{streaming || sending ? (
									<Button
										type="button"
										className="min-w-20 rounded-sm"
										onClick={() => void stop()}
									>
										<Square size={14} className="mr-1" />
										Stop
									</Button>
								) : (
									<Button
										type="button"
										className="min-w-20 rounded-sm"
										disabled={!readySelected.length || !prompt.trim()}
										onClick={() => void send()}
									>
										Send
									</Button>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			<Dialog open={clearOpen} onOpenChange={setClearOpen}>
				<DialogContent className="rounded-2xl sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Clear chat</DialogTitle>
						<DialogDescription>
							This permanently removes all messages and citation snapshots for
							this notebook. Sources stay as they are.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							className="rounded-sm"
							onClick={() => setClearOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							className="rounded-sm"
							onClick={async () => {
								await clearChat({ notebookId })
								setClearOpen(false)
							}}
						>
							Clear chat
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

function CitationPill({
	index,
	title,
	excerpt,
	canNavigate,
	onOpen,
}: {
	index: number
	title: string
	excerpt: string
	canNavigate: boolean
	onOpen: () => void
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="relative inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-primary/15 px-2 text-xs font-medium text-primary before:absolute before:-inset-2"
					aria-label={`Citation ${index}: ${title}`}
					onClick={() => {
						if (canNavigate) {
							onOpen()
						}
					}}
				>
					{index}
				</button>
			</PopoverTrigger>
			<PopoverContent className="max-w-sm rounded-xl text-sm">
				<p className="mb-2 font-medium">{title}</p>
				<p className="text-muted-foreground">{excerpt}</p>
				{!canNavigate ? (
					<p className="mt-2 text-xs text-muted-foreground">
						Source deleted. Excerpt retained.
					</p>
				) : null}
			</PopoverContent>
		</Popover>
	)
}
