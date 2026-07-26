import type { FunctionReturnType } from "convex/server"
import { AnimatePresence, motion } from "motion/react"
import { memo } from "react"
import { ChatAssistantMessage } from "src/components/chat/ChatAssistantMessage"
import { ChatEmptyPrompt } from "src/components/chat/ChatEmptyPrompt"
import { ChatSourceBoundary } from "src/components/chat/ChatSourceBoundary"
import type { ChatCiteArgs } from "src/components/chat/CitationPills"
import type { api } from "src/convex/_generated/api"
import type { StreamCitation } from "src/lib/chat_sse"
import { fadeTransition } from "src/lib/motion"

export type { ChatCiteArgs }

type ChatListEntry = FunctionReturnType<typeof api.chat.list>[number]

export type ChatMessageListProps = {
	entries: ChatListEntry[] | undefined
	streamedContent: string | null
	streamedCitations: StreamCitation[]
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
	streamedCitations,
	optimisticUserPrompt,
	hasReadySources,
	canRetry,
	onAddSource,
	onCite,
	onSendSuggestion,
	onRetry,
}: ChatMessageListProps) {
	const empty =
		entries !== undefined &&
		!optimisticUserPrompt &&
		!entries.some((entry) => entry.kind === "message")

	return (
		<div className="mx-auto flex min-h-full w-full max-w-[50rem] flex-col gap-6 py-4">
			{empty ? (
				<ChatEmptyPrompt
					readySelectedCount={hasReadySources ? 1 : 0}
					onAddSource={onAddSource}
					onSendSuggestion={onSendSuggestion}
				/>
			) : null}

			<AnimatePresence initial={false}>
				{(entries ?? []).map((entry) => {
					if (entry.kind === "sourceBoundary") {
						return (
							<motion.div
								key={entry.selectionHash ?? entry._id}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={fadeTransition}
								className="flex items-center gap-3 py-2 text-muted-foreground"
							>
								<ChatSourceBoundary
									activeSourceCount={entry.activeSourceCount ?? 0}
								/>
							</motion.div>
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
							streamedCitations={streamedCitations}
							canRetry={canRetry}
							onCite={onCite}
							onRetry={onRetry}
						/>
					)
				})}
			</AnimatePresence>

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
