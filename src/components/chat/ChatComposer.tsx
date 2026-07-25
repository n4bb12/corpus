import { Layers, Square } from "lucide-react"
import { Button } from "src/components/ui/button"
import { Textarea } from "src/components/ui/textarea"
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

	return (
		<div className="border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
			<div className="mx-auto w-full max-w-[50rem] space-y-2">
				{error ? <p className="text-sm text-destructive">{error}</p> : null}
				<div className="rounded-2xl border border-border bg-card p-3 shadow-(--shadow-pine)">
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
								onSend()
							}
						}}
						placeholder={
							readySourceCount
								? "Ask your sources"
								: "Select ready sources to start chatting"
						}
						disabled={!readySourceCount || sending}
						className="min-h-24 max-h-60 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
					/>
					<div className="mt-2 flex items-center justify-between gap-3">
						<div className="text-xs text-muted-foreground tabular-nums">
							{remaining <= 200 ? `${remaining} left` : null}
						</div>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="rounded-full"
								aria-label={`${readySourceCount} active sources`}
								onClick={onOpenSources}
							>
								<Layers size={16} className="mr-1" />
								{readySourceCount} sources
							</Button>
							{streaming || sending ? (
								<Button
									type="button"
									className="min-w-20 rounded-sm"
									onClick={onStop}
								>
									<Square size={14} className="mr-1" />
									Stop
								</Button>
							) : (
								<Button
									type="button"
									className="min-w-20 rounded-sm"
									disabled={!readySourceCount || !prompt.trim()}
									onClick={onSend}
								>
									Send
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
