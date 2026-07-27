import { Pencil } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { displayNotebookTitle } from "src/lib/limits"
import { cn } from "src/lib/utils"

export type InlineNotebookTitleProps = {
  title: string
  onSave: (title: string) => Promise<void>
  loading?: boolean
  className?: string
}

export function InlineNotebookTitle({
  title,
  onSave,
  loading = false,
  className,
}: InlineNotebookTitleProps) {
  const [draft, setDraft] = useState(title)
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const display = displayNotebookTitle(title)

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
    const next = draft.trim()
    setDraft(next)

    if (next !== title) {
      await onSave(next)
    }
  }

  return (
    <div
      className={cn("group relative min-w-0", className)}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <span className="sr-only" role="status">
          Loading notebook title
        </span>
      ) : null}
      <input
        ref={inputRef}
        value={editing ? draft : display}
        readOnly={!editing || loading}
        onFocus={() => {
          if (loading) {
            return
          }

          setEditing(true)
          setDraft(title)
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (loading) {
            return
          }

          void commit()
        }}
        onKeyDown={(event) => {
          if (loading) {
            return
          }

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
        aria-hidden={loading || undefined}
        title={loading ? undefined : "Click to rename"}
        placeholder={displayNotebookTitle("")}
        className={cn(
          "h-9 w-full min-w-0 truncate rounded-lg border border-transparent bg-transparent py-1 pr-9 pl-2",
          "cursor-text text-lg font-semibold tracking-tight outline-none",
          "transition-all duration-(--duration-hover) ease-spring",
          loading
            ? "pointer-events-none placeholder-shimmer"
            : "hover:border-muted-foreground/70 hover:bg-muted/55 focus-visible:border-primary focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary/30",
        )}
      />
      {loading ? null : (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center",
            "rounded-md text-muted-foreground transition-all duration-(--duration-hover) ease-spring",
            editing
              ? "opacity-0"
              : "opacity-0 group-hover:bg-background/70 group-hover:opacity-100 group-focus-within:opacity-0",
          )}
        >
          <Pencil size={14} strokeWidth={1.5} />
        </span>
      )}
    </div>
  )
}
