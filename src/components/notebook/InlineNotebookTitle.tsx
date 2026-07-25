import { useEffect, useRef, useState } from "react"
import { UNTITLED_NOTEBOOK } from "src/lib/limits"
import { cn } from "src/lib/utils"

export type InlineNotebookTitleProps = {
	title: string
	onSave: (title: string) => Promise<void>
	className?: string
}

export function InlineNotebookTitle({
	title,
	onSave,
	className,
}: InlineNotebookTitleProps) {
	const [draft, setDraft] = useState(title)
	const [editing, setEditing] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (!editing) {
			setDraft(title)
		}
	}, [title, editing])

	useEffect(() => {
		if (editing) {
			inputRef.current?.focus()
			inputRef.current?.select()
		}
	}, [editing])

	async function commit() {
		setEditing(false)
		const next = draft.trim() || UNTITLED_NOTEBOOK
		setDraft(next)

		if (next !== title) {
			await onSave(next)
		}
	}

	return (
		<input
			ref={inputRef}
			value={draft}
			readOnly={!editing}
			onFocus={() => setEditing(true)}
			onChange={(event) => setDraft(event.target.value)}
			onBlur={() => void commit()}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					event.preventDefault()
					void commit()
				}

				if (event.key === "Escape") {
					setDraft(title)
					setEditing(false)
					inputRef.current?.blur()
				}
			}}
			maxLength={100}
			aria-label="Notebook title"
			className={cn(
				"h-9 w-full min-w-0 truncate rounded-[10px] border border-transparent bg-transparent px-2 text-lg font-semibold tracking-tight outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
				className,
			)}
		/>
	)
}
