import { ChatComposer } from "src/components/chat/ChatComposer"
import {
	type ChatCiteArgs,
	ChatMessageList,
} from "src/components/chat/ChatMessageList"
import { ClearChatDialog } from "src/components/chat/ClearChatDialog"
import { useChatPane } from "src/components/chat/useChatPane"
import { Button } from "src/components/ui/shadcn/button"
import { ScrollArea } from "src/components/ui/shadcn/scroll-area"
import type { Id } from "src/convex/_generated/dataModel"

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
	const chat = useChatPane(notebookId)

	return (
		<div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
			<div className="flex shrink-0 items-center justify-end px-4 pt-4">
				<Button
					variant="ghost"
					size="sm"
					className="rounded-full"
					onClick={() => chat.setClearOpen(true)}
				>
					Clear chat
				</Button>
			</div>

			<ScrollArea
				viewportRef={chat.scrollerRef}
				className="min-h-0 flex-1 overflow-hidden px-4 pb-56"
				onViewportScroll={(event) => {
					const node = event.currentTarget
					chat.stickToBottom.current =
						node.scrollHeight - node.scrollTop - node.clientHeight < 80
				}}
			>
				<ChatMessageList
					entries={chat.entries}
					streamedContent={chat.streamedContent}
					streamedCitations={chat.streamedCitations}
					optimisticUserPrompt={chat.optimisticUserPrompt}
					hasReadySources={chat.readySelected.length > 0}
					canRetry={chat.canRetry}
					onAddSource={onAddSource}
					onCite={onCite}
					onSendSuggestion={(suggestion) => void chat.send(suggestion)}
					onRetry={(nextPrompt, assistantId) =>
						void chat.send(nextPrompt, assistantId)
					}
				/>
			</ScrollArea>

			<div className="absolute inset-x-0 bottom-0 z-10">
				<ChatComposer
					prompt={chat.prompt}
					error={chat.error}
					readySourceCount={chat.readySelected.length}
					sending={chat.sending}
					streaming={!!chat.streaming}
					onPromptChange={chat.setPrompt}
					onSend={() => void chat.send()}
					onStop={() => void chat.stop()}
					onOpenSources={onOpenSources}
				/>
			</div>

			<ClearChatDialog
				open={chat.clearOpen}
				onOpenChange={chat.setClearOpen}
				onConfirm={async () => {
					await chat.clearChat({ notebookId })
					chat.setClearOpen(false)
				}}
			/>
		</div>
	)
}
