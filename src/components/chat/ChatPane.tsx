import { ChatComposer } from "src/components/chat/ChatComposer"
import {
  type ChatCiteArgs,
  ChatMessageList,
} from "src/components/chat/ChatMessageList"
import { ChatScrollAffordance } from "src/components/chat/ChatScrollAffordance"
import { ClearChatDialog } from "src/components/chat/ClearChatDialog"
import { useChatPaneData } from "src/components/chat/useChatPaneData"
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
  const chat = useChatPaneData(notebookId)

  const hasChat =
    !!chat.optimisticUserPrompt ||
    !!chat.entries?.some((entry) => entry.kind === "message")

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      {hasChat ? (
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
      ) : null}

      <ScrollArea
        viewportRef={chat.scrollerRef}
        className="min-h-0 flex-1 overflow-hidden px-4"
        onViewportScroll={(event) => {
          chat.updateStickToBottom(event.currentTarget)
        }}
      >
        <ChatMessageList
          entries={chat.entries}
          streamedContent={chat.streamedContent}
          streamedCitations={chat.streamedCitations}
          streamedInsufficient={chat.streamedInsufficient}
          progressLabel={chat.progressLabel}
          retryAssistantId={chat.retryAssistantId}
          optimisticUserPrompt={chat.optimisticUserPrompt}
          emptyPromptState={chat.emptyPromptState}
          canRetry={chat.canRetry}
          onAddSource={onAddSource}
          onOpenSources={onOpenSources}
          onCite={onCite}
          onSendSuggestion={(suggestion) => void chat.send(suggestion)}
          onRetry={(nextPrompt, assistantId) =>
            void chat.send(nextPrompt, assistantId)
          }
        />
      </ScrollArea>

      <div className="absolute inset-x-0 bottom-0 z-10">
        <ChatScrollAffordance
          visible={!chat.atBottom}
          onScrollToBottom={chat.scrollToBottom}
        />
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
