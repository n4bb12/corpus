import type { FunctionReturnType } from "convex/server"
import { marked } from "marked"
import { CitationPill } from "src/components/chat/CitationPill"
import { Button } from "src/components/ui/button"
import type { api } from "src/convex/_generated/api"
import { splitCitedParagraphs, stripCitationMarkers } from "src/lib/citations"

export type ChatCiteArgs = {
	sourceId?: string
	startOffset?: number
	endOffset?: number
	excerpt: string
	canNavigate: boolean
}

type ChatListEntry = FunctionReturnType<typeof api.chat.list>[number]
type ChatCitation = NonNullable<ChatListEntry["citations"]>[number]

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

function CitationPills({
	citations,
	indexes,
	onCite,
}: {
	citations: ChatCitation[]
	indexes: number[]
	onCite: (args: ChatCiteArgs) => void
}) {
	const uniqueIndexes = [...new Set(indexes)]

	return (
		<div className="flex flex-wrap gap-2">
			{uniqueIndexes.map((index) => {
				const citation = citations[index - 1]

				if (!citation) {
					return null
				}

				return (
					<CitationPill
						key={`${citation._id}-${index}`}
						index={index}
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
				)
			})}
		</div>
	)
}

function AssistantContent({
	content,
	citations,
	onCite,
}: {
	content: string
	citations: ChatCitation[]
	onCite: (args: ChatCiteArgs) => void
}) {
	const hasInlineMarkers = /\[\[cite:\d+\]\]/.test(content)

	if (!citations.length || !hasInlineMarkers) {
		const html = marked.parse(stripCitationMarkers(content), {
			async: false,
		}) as string

		return (
			<div className="space-y-3">
				<div
					className="prose prose-sm dark:prose-invert max-w-none"
					dangerouslySetInnerHTML={{ __html: html }}
				/>
				{citations.length ? (
					<CitationPills
						citations={citations}
						indexes={citations.map((_, index) => index + 1)}
						onCite={onCite}
					/>
				) : null}
			</div>
		)
	}

	const paragraphs = splitCitedParagraphs(content)

	return (
		<div className="space-y-3">
			{paragraphs.map((paragraph) => {
				const html = paragraph.text
					? (marked.parse(paragraph.text, { async: false }) as string)
					: ""
				const key = `${paragraph.text}:${paragraph.citationIndexes.join(",")}`

				return (
					<div key={key} className="space-y-2">
						{html ? (
							<div
								className="prose prose-sm dark:prose-invert max-w-none"
								dangerouslySetInnerHTML={{ __html: html }}
							/>
						) : null}
						{paragraph.citationIndexes.length ? (
							<CitationPills
								citations={citations}
								indexes={paragraph.citationIndexes}
								onCite={onCite}
							/>
						) : null}
					</div>
				)
			})}
		</div>
	)
}

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

				const latestFailed =
					canRetry &&
					(entry.status === "failed" ||
						entry.status === "canceled" ||
						(entry.status === "complete" && !entry.content?.trim()))
				const showProgress =
					!entry.content &&
					(entry.status === "pending" || entry.status === "streaming") &&
					!!entry.progressLabel
				const showFailure =
					entry.status === "failed" ||
					entry.status === "canceled" ||
					(latestFailed && !entry.content?.trim())

				return (
					<div key={entry._id} className="space-y-3">
						{showProgress ? (
							<p
								className="shimmer text-sm font-medium text-primary"
								role="status"
							>
								{entry.progressLabel}
							</p>
						) : null}
						{entry.content ? (
							<AssistantContent
								content={entry.content}
								citations={entry.citations ?? []}
								onCite={onCite}
							/>
						) : null}
						{showFailure ? (
							<div className="space-y-2">
								{!entry.content ? (
									<div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3">
										<p className="text-sm text-destructive">
											{entry.status === "canceled"
												? "Response canceled."
												: entry.errorMessage || "Generation failed."}
										</p>
									</div>
								) : (
									<p className="text-xs text-muted-foreground">
										{entry.status === "canceled"
											? "Canceled"
											: entry.errorMessage || "Failed"}
									</p>
								)}
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
						) : null}
					</div>
				)
			})}
		</div>
	)
}
