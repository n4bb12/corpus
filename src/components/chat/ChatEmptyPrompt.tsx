import { Eyebrow } from "src/components/ui/Eyebrow"
import { IslandCta } from "src/components/ui/IslandCta"
import { PendingLabel } from "src/components/ui/PendingLabel"

const SUGGESTIONS = [
  "Give me a concise brief of the sources.",
  "What are the key takeaways?",
  "Where do these sources disagree?",
  "Explain this like I'm new to the topic.",
  "What's the secret?",
]

export type ChatEmptyPromptState = "ready" | "processing" | "select" | "empty"

export type ChatEmptyPromptProps = {
  state: ChatEmptyPromptState
  onAddSource: () => void
  onOpenSources: () => void
  onSendSuggestion: (suggestion: string) => void
}

export function ChatEmptyPrompt({
  state,
  onAddSource,
  onOpenSources,
  onSendSuggestion,
}: ChatEmptyPromptProps) {
  if (state === "ready") {
    return (
      <div className="space-y-6 pt-10">
        <div className="space-y-3">
          <Eyebrow>Grounded answers</Eyebrow>
          <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Ask your sources
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Answers stay grounded in the sources you select, with citations you
            can open.
          </p>
        </div>
        <div className="space-y-2.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="group block w-full rounded-2xl bg-muted/45 px-4 py-3.5 text-left text-sm transition-all duration-(--duration-hover) ease-spring hover:translate-x-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => onSendSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (state === "processing") {
    return (
      <div className="space-y-5 pt-10">
        <Eyebrow>Getting ready</Eyebrow>
        <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Sources are processing
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Chat unlocks when at least one selected source has finished
          processing.
        </p>
        <PendingLabel
          pending
          pendingLabel="Processing sources"
          className="text-sm text-muted-foreground"
        >
          Processing sources
        </PendingLabel>
      </div>
    )
  }

  if (state === "select") {
    return (
      <div className="space-y-5 pt-10">
        <Eyebrow>Sources first</Eyebrow>
        <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Select sources to chat
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Choose at least one source that has finished processing.
        </p>
        <IslandCta onClick={onOpenSources}>Select sources</IslandCta>
      </div>
    )
  }

  return (
    <div className="space-y-5 pt-10">
      <Eyebrow>Sources first</Eyebrow>
      <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
        Add and select sources
      </h2>
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
        Chat needs at least one selected source that has finished processing.
      </p>
      <IslandCta onClick={onAddSource}>Add first source</IslandCta>
    </div>
  )
}
