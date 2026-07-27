import type { FunctionReturnType } from "convex/server"
import { AnimatePresence, motion } from "motion/react"
import { memo } from "react"
import { ChatAssistantMessage } from "src/components/chat/ChatAssistantMessage"
import {
  ChatEmptyPrompt,
  type ChatEmptyPromptState,
} from "src/components/chat/ChatEmptyPrompt"
import { ChatProgressLabel } from "src/components/chat/ChatProgressLabel"
import { ChatSourceBoundary } from "src/components/chat/ChatSourceBoundary"
import type { ChatCiteArgs } from "src/components/chat/CitationPills"
import type { api } from "src/convex/_generated/api"
import { shouldShowOptimisticProgress } from "src/lib/chatHistory"
import type { StreamCitation } from "src/lib/chatSse"
import { fadeTransition } from "src/lib/motion"

export type { ChatCiteArgs }

type ChatListEntry = FunctionReturnType<typeof api.chat.list>[number]

export type ChatMessageListProps = {
  entries: ChatListEntry[] | undefined
  streamedContent: string | null
  streamedCitations: StreamCitation[]
  streamedInsufficient: boolean | null
  progressLabel: string | null
  retryAssistantId: string | null
  optimisticUserPrompt: string | null
  emptyPromptState: ChatEmptyPromptState
  canRetry: boolean
  onAddSource: () => void
  onOpenSources: () => void
  onCite: (args: ChatCiteArgs) => void
  onSendSuggestion: (suggestion: string) => void
  onRetry: (prompt: string, assistantId: string) => void
}

export const ChatMessageList = memo(function ChatMessageList({
  entries,
  streamedContent,
  streamedCitations,
  streamedInsufficient,
  progressLabel,
  retryAssistantId,
  optimisticUserPrompt,
  emptyPromptState,
  canRetry,
  onAddSource,
  onOpenSources,
  onCite,
  onSendSuggestion,
  onRetry,
}: ChatMessageListProps) {
  const empty =
    entries !== undefined &&
    !optimisticUserPrompt &&
    !entries.some((entry) => entry.kind === "message")
  const showOptimisticProgress = shouldShowOptimisticProgress(
    entries,
    progressLabel,
    retryAssistantId,
  )

  return (
    <div className="mx-auto flex min-h-full w-full max-w-200 flex-col gap-6 pt-4 pb-48 md:pb-72">
      {empty ? (
        <ChatEmptyPrompt
          state={emptyPromptState}
          onAddSource={onAddSource}
          onOpenSources={onOpenSources}
          onSendSuggestion={onSendSuggestion}
        />
      ) : null}

      <AnimatePresence initial={false}>
        {(entries ?? []).map((entry, index, list) => {
          if (entry.kind === "sourceBoundary") {
            // Trailing boundary keeps one stable key across selection updates and
            // optimistic → server id swaps so AnimatePresence does not stack rows.
            const isTrailing = index === list.length - 1

            return (
              <motion.div
                key={isTrailing ? "trailing-source-boundary" : entry._id}
                initial={{
                  opacity: 0,
                  gridTemplateRows: "0fr",
                  marginTop: "-1.5rem",
                }}
                animate={{
                  opacity: 1,
                  gridTemplateRows: "1fr",
                  marginTop: 0,
                }}
                exit={{
                  opacity: 0,
                  gridTemplateRows: "0fr",
                  marginTop: "-1.5rem",
                }}
                transition={fadeTransition}
                className="grid"
              >
                <div className="min-h-0 overflow-hidden">
                  <ChatSourceBoundary
                    activeSourceCount={entry.activeSourceCount ?? 0}
                  />
                </div>
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
                entry.status === "pending" ||
                entry.status === "streaming" ||
                entry._id === retryAssistantId
                  ? streamedContent
                  : null
              }
              streamedCitations={streamedCitations}
              streamedInsufficient={streamedInsufficient}
              progressLabel={
                entry.status === "pending" ||
                entry.status === "streaming" ||
                entry._id === retryAssistantId
                  ? progressLabel
                  : null
              }
              retrying={entry._id === retryAssistantId}
              skipProgressEntrance={
                !showOptimisticProgress && !!progressLabel && !retryAssistantId
              }
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

      {showOptimisticProgress ? (
        <ChatProgressLabel label={progressLabel} />
      ) : null}
    </div>
  )
})

function ChatUserMessage({ content }: { content?: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-17/20 rounded-2xl bg-card px-4 py-3 shadow-(--shadow-pine)">
        <p className="whitespace-pre-wrap text-sm">{content}</p>
      </div>
    </div>
  )
}
