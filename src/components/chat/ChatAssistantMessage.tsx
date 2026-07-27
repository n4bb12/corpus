import type { FunctionReturnType } from "convex/server"
import { AssistantContent } from "src/components/chat/AssistantContent"
import { ChatProgressLabel } from "src/components/chat/ChatProgressLabel"
import type { ChatCiteArgs } from "src/components/chat/CitationPills"
import { Button } from "src/components/ui/shadcn/button"
import type { api } from "src/convex/_generated/api"
import {
  resolveStreamedAssistantContent,
  type StreamCitation,
} from "src/lib/chatSse"

type ChatListEntry = FunctionReturnType<typeof api.chat.list>[number]

export type ChatAssistantMessageProps = {
  entry: ChatListEntry
  entries: ChatListEntry[] | undefined
  streamedContent: string | null
  streamedCitations: StreamCitation[]
  streamedInsufficient: boolean | null
  progressLabel: string | null
  retrying?: boolean
  skipProgressEntrance?: boolean
  canRetry: boolean
  onCite: (args: ChatCiteArgs) => void
  onRetry: (prompt: string, assistantId: string) => void
}

export function ChatAssistantMessage({
  entry,
  entries,
  streamedContent,
  streamedCitations,
  streamedInsufficient,
  progressLabel,
  retrying = false,
  skipProgressEntrance = false,
  canRetry,
  onCite,
  onRetry,
}: ChatAssistantMessageProps) {
  const streamed = streamedContent
    ? resolveStreamedAssistantContent(streamedContent, streamedCitations)
    : null
  const content =
    retrying && !streamedContent ? null : (streamed?.content ?? entry.content)
  const citations = streamed?.citations ?? entry.citations ?? []
  const insufficient =
    streamedContent !== null ? !!streamedInsufficient : !!entry.insufficient
  const latestFailed =
    canRetry &&
    (entry.status === "failed" ||
      entry.status === "canceled" ||
      (entry.status === "complete" && !entry.content?.trim()))
  const isStreaming =
    entry.status === "pending" || entry.status === "streaming" || retrying
  const resolvedProgress = progressLabel ?? entry.progressLabel ?? null
  const showProgress = !content && isStreaming && !!resolvedProgress
  const showFailure =
    !retrying &&
    (entry.status === "failed" ||
      entry.status === "canceled" ||
      (latestFailed && !entry.content?.trim()))

  return (
    <div className="space-y-3">
      <ChatProgressLabel
        label={showProgress ? resolvedProgress : null}
        skipEntrance={skipProgressEntrance}
      />
      {content ? (
        <AssistantContent
          content={content}
          citations={citations}
          insufficient={insufficient}
          onCite={onCite}
        />
      ) : null}
      {showFailure ? (
        <div className="space-y-2">
          {!entry.content ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3">
              <p className="text-sm text-destructive">
                {entry.status === "canceled"
                  ? "You stopped this answer."
                  : entry.errorMessage || "Couldn't generate an answer."}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {entry.status === "canceled"
                ? "Stopped"
                : entry.errorMessage || "Couldn't finish"}
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
}
