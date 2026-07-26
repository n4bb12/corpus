import { IslandCta } from "src/components/ui/IslandCta"

const SUGGESTIONS = [
	"What are the main claims in these sources?",
	"Where do these sources agree or disagree?",
	"Summarize the strongest evidence for the key point.",
]

export type ChatEmptyPromptProps = {
	readySelectedCount: number
	onAddSource: () => void
	onSendSuggestion: (suggestion: string) => void
}

export function ChatEmptyPrompt({
	readySelectedCount,
	onAddSource,
	onSendSuggestion,
}: ChatEmptyPromptProps) {
	if (readySelectedCount) {
		return (
			<div className="space-y-6 pt-10">
				<div className="space-y-3">
					<span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium tracking-[0.2em] text-primary uppercase">
						Grounded chat
					</span>
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
							className="group block w-full rounded-2xl bg-muted/45 px-4 py-3.5 text-left text-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:translate-x-1 hover:bg-muted"
							onClick={() => onSendSuggestion(suggestion)}
						>
							{suggestion}
						</button>
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-5 pt-10">
			<span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium tracking-[0.2em] text-primary uppercase">
				Sources first
			</span>
			<h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
				Add and select sources
			</h2>
			<p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
				Chat needs at least one ready, selected source before it can answer.
			</p>
			<IslandCta onClick={onAddSource}>Add first source</IslandCta>
		</div>
	)
}
