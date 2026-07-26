import { Button } from "src/components/ui/button"

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
			<div className="space-y-4 pt-8">
				<div>
					<h2 className="text-2xl font-semibold tracking-tight">
						Ask your sources
					</h2>
					<p className="mt-2 max-w-xl text-sm text-muted-foreground">
						Answers stay grounded in the sources you select, with citations you
						can open.
					</p>
				</div>
				<div className="space-y-2">
					{SUGGESTIONS.map((suggestion) => (
						<button
							key={suggestion}
							type="button"
							className="block rounded-xl bg-muted/50 px-3 py-3 text-left text-sm transition-colors hover:bg-muted hover:transition-none"
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
		<div className="space-y-4 pt-8">
			<h2 className="text-2xl font-semibold tracking-tight">
				Add and select sources
			</h2>
			<p className="max-w-xl text-sm text-muted-foreground">
				Chat needs at least one ready, selected source before it can answer.
			</p>
			<Button className="rounded-sm" onClick={onAddSource}>
				Add first source
			</Button>
		</div>
	)
}
