import type { FunctionReturnType } from "convex/server"
import { marked } from "marked"
import { CitationPill } from "src/components/chat/CitationPill"
import { Button } from "src/components/ui/button"
import type { api } from "src/convex/_generated/api"

export type ChatCiteArgs = {
	sourceId?: string
	startOffset?: number
	endOffset?: number
	excerpt: string
	canNavigate: boolean
}

type ChatListEntry = FunctionReturnType<typeof api.chat.list>[number]

export type ChatMessageListProps = {
	entries: ChatListEntry[] | undefined
	readySelectedCount: number
	canRetry: boolean
	onAddSource: () => void
	onCite: (args: ChatCiteArgs) => void
	onSendSuggestion: (suggestion: string) => void
	onRetry: (prompt: string, assistantId: string) => void
}

const SUGGESTIONS = [
	"What are the main claims in these sources?",
	"Where do these sources agree or disagree?",
	"Summarize the strongest evidence for the key point.",
]

export function ChatMessageList({
	entries,
	readySelectedCount,
	canRetry,
	onAddSource,
	onCite,
	onSendSuggestion,
	onRetry,
}: ChatMessageListProps) {
	const empty = !entries?.some((entry) => entry.kind === "message")

	return (
		<div className="mx-auto flex min-h-full w-full max-w-[50rem] flex-col gap-6 py-4">
			{empty && readySelectedCount ? (
				<div className="space-y-4 pt-8">
					<div>
						<h2 className="text-2xl font-semibold tracking-tight">
							Ask your sources
						</h2>
						<p className="mt-2 max-w-xl text-sm text-muted-foreground">
							Answers stay grounded in the sources you select, with citations
							you can open.
						</p>
					</div>
					<div className="space-y-2">
						{SUGGESTIONS.map((suggestion) => (
							<button
								key={suggestion}
								type="button"
								className="block w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-muted/70"
								onClick={() => onSendSuggestion(suggestion)}
							>
								{suggestion}
							</button>
						))}
					</div>
				</div>
			) : null}

			{empty && !readySelectedCount ? (
				<div className="space-y-4 pt-8">
					<h2 className="text-2xl font-semibold tracking-tight">
						Add and select sources
					</h2>
					<p className="max-w-xl text-sm text-muted-foreground">
						Chat needs at least one ready, selected source before it can answer.
					</p>
					<Button className="rounded-sm" onClick={onAddSource}>
						Add first source
					</Button>
				</div>
			) : null}

			{(entries ?? []).map((entry) => {
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
								<p className="whitespace-pre-wrap text-sm">{entry.content}</p>
							</div>
						</div>
					)
				}

				const html = marked.parse(entry.content || "", {
					async: false,
				}) as string
				const latestFailed =
					canRetry && (entry.status === "failed" || entry.status === "canceled")
				const showProgress =
					!entry.content &&
					(entry.status === "pending" || entry.status === "streaming") &&
					!!entry.progressLabel

				return (
					<div key={entry._id} className="space-y-3">
						{showProgress ? (
							<p className="status-shimmer text-sm font-medium" role="status">
								{entry.progressLabel}
							</p>
						) : null}
						{entry.content ? (
							<div
								className="prose prose-sm dark:prose-invert max-w-none"
								dangerouslySetInnerHTML={{ __html: html }}
							/>
						) : null}						{entry.citations?.length ? (
							<div className="flex flex-wrap gap-2">
								{entry.citations.map((citation, index) => (
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
									onRetry(user?.content || "", entry._id)
								}}
							>
								Retry
							</Button>
						) : null}
					</div>
				)
			})}
		</div>
	)
}
