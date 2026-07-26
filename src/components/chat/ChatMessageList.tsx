import type { FunctionReturnType } from "convex/server"
import { Layers } from "lucide-react"
import { memo } from "react"
import { ChatAssistantMessage } from "src/components/chat/ChatAssistantMessage"
import { ChatEmptyPrompt } from "src/components/chat/ChatEmptyPrompt"
import type { ChatCiteArgs } from "src/components/chat/CitationPills"
import type { api } from "src/convex/_generated/api"

export type { ChatCiteArgs }

type ChatListEntry = FunctionReturnType<typeof api.chat.list>[number]

export type ChatMessageListProps = {
	entries: ChatListEntry[] | undefined
	streamedContent: string | null
	optimisticUserPrompt: string | null
	hasReadySources: boolean
	canRetry: boolean
	onAddSource: () => void
	onCite: (args: ChatCiteArgs) => void
	onSendSuggestion: (suggestion: string) => void
	onRetry: (prompt: string, assistantId: string) => void
}

export const ChatMessageList = memo(function ChatMessageList({
	entries,
	streamedContent,
	optimisticUserPrompt,
	hasReadySources,
	canRetry,
	onAddSource,
	onCite,
	onSendSuggestion,
	onRetry,
}: ChatMessageListProps) {
	const empty =
		!optimisticUserPrompt && !entries?.some((entry) => entry.kind === "message")

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
							className="flex items-center gap-3 py-2 text-muted-foreground"
						>
							<div className="h-px min-w-4 flex-1 bg-border" />
							<p className="flex shrink-0 items-center gap-1.5 text-xs">
								<Layers size={12} aria-hidden />
								<span>
									Sources changed · {entry.activeSourceCount ?? 0} active
								</span>
							</p>
							<div className="h-px min-w-4 flex-1 bg-border" />
						</div>
					)
				}

				if (entry.role === "user") {
					return (
						<ChatUserMessage key={entry._id} content={entry.content ?? ""} />
					)
				}

				return (
					<ChatAssistantMessage
						key={entry._id}
						entry={entry}
						entries={entries}
						streamedContent={
							entry.status === "pending" || entry.status === "streaming"
								? streamedContent
								: null
						}
						canRetry={canRetry}
						onCite={onCite}
						onRetry={onRetry}
					/>
				)
			})}

			{optimisticUserPrompt ? (
				<ChatUserMessage content={optimisticUserPrompt} />
			) : null}
		</div>
	)
})

function ChatUserMessage({ content }: { content?: string }) {
	return (
		<div className="flex justify-end">
			<div className="max-w-[85%] rounded-2xl bg-card px-4 py-3 shadow-(--shadow-pine)">
				<p className="whitespace-pre-wrap text-sm">{content}</p>
			</div>
		</div>
	)
}
