import { Layers, Square } from "lucide-react"
import { Bezel } from "src/components/ui/Bezel"
import { IslandCta } from "src/components/ui/IslandCta"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { Button } from "src/components/ui/shadcn/button"
import { Textarea } from "src/components/ui/shadcn/textarea"
import { LIMITS } from "src/lib/limits"

export type ChatComposerProps = {
  prompt: string
  error: string | null
  readySourceCount: number
  sending: boolean
  streaming: boolean
  onPromptChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  onOpenSources: () => void
}

export function ChatComposer({
  prompt,
  error,
  readySourceCount,
  sending,
  streaming,
  onPromptChange,
  onSend,
  onStop,
  onOpenSources,
}: ChatComposerProps) {
  const remaining = LIMITS.maxPromptCharacters - prompt.length
  const canSubmit = !!readySourceCount && !!prompt.trim() && !sending && !streaming

  return (
    <div className="pointer-events-none bg-background px-4 pb-4">
      <div className="pointer-events-auto mx-auto w-full max-w-200 space-y-2">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Bezel
          className="bg-background shadow-(--shadow-pine)"
          innerClassName="p-3.5 md:p-4"
        >
          <Textarea
            value={prompt}
            onChange={(event) =>
              onPromptChange(
                event.target.value.slice(0, LIMITS.maxPromptCharacters),
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()

                if (canSubmit) {
                  onSend()
                }
              }
            }}
            placeholder={
              readySourceCount
                ? "Ask your sources"
                : "Select sources to start chatting"
            }
            className="min-h-12 max-h-60 resize-none border-0 bg-transparent p-1 text-base shadow-none focus-visible:ring-0 md:min-h-24 md:text-base"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground tabular-nums">
              {remaining <= 200 ? `${remaining} left` : null}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
                aria-label={`${readySourceCount} selected sources`}
                onClick={onOpenSources}
              >
                <Layers size={16} strokeWidth={1.5} className="mr-1" />
                {readySourceCount} sources
              </Button>

              {streaming ? (
                <IslandCta type="button" showArrow={false} onClick={onStop}>
                  <span className="inline-flex items-center gap-2 leading-none">
                    <Square size={16} className="shrink-0" aria-hidden />
                    Stop
                  </span>
                </IslandCta>
              ) : (
                <IslandCta
                  type="button"
                  disabled={!canSubmit}
                  onClick={onSend}
                  showArrow={!sending}
                >
                  <PendingLabel pending={sending} pendingLabel="Sending">
                    Send
                  </PendingLabel>
                </IslandCta>
              )}
            </div>
          </div>
        </Bezel>
      </div>
    </div>
  )
}
