import type { FunctionReturnType } from "convex/server"
import { memo } from "react"
import { ChatAssistantMessage } from "src/components/chat/ChatAssistantMessage"
import { ChatEmptyPrompt } from "src/components/chat/ChatEmptyPrompt"
import type { ChatCiteArgs } from "src/components/chat/CitationPills"
import type { api } from "src/convex/_generated/api"

export type { ChatCiteArgs }

type ChatListEntry = FunctionReturnType<typeof api.chat.list>[number]

export type ChatMessageListProps = {
	entries: ChatListEntry[] | undefined
	hasReadySources: boolean
	canRetry: boolean
	onAddSource: () => void
	onCite: (args: ChatCiteArgs) => void
	onSendSuggestion: (suggestion: string) => void
	onRetry: (prompt: string, assistantId: string) => void
}

export const ChatMessageList = memo(function ChatMessageList({
	entries,
	hasReadySources,
	canRetry,
	onAddSource,
	onCite,
	onSendSuggestion,
	onRetry,
}: ChatMessageListProps) {
	const empty = !entries?.some((entry) => entry.kind === "message")

	return (
		<div className="mx-auto flex min-h-full w-full max-w-[50rem] flex-col gap-6 py-4">
			{empty ? (
				<ChatEmptyPrompt
					readySelectedCount={hasReadySources ? 1 : 0}
					onAddSource={onAddSource}
					onSendSuggestion={onSendSuggestion}
				/>
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

				return (
					<ChatAssistantMessage
						key={entry._id}
						entry={entry}
						entries={entries}
						canRetry={canRetry}
						onCite={onCite}
						onRetry={onRetry}
					/>
				)
			})}
		</div>
	)
})
