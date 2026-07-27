export type CitationPillProps = {
  index: number
  title: string
  canNavigate: boolean
  onHover: (element: HTMLButtonElement) => void
  onLeave: () => void
  onOpen: () => void
}

export function CitationPill({
  index,
  title,
  canNavigate,
  onHover,
  onLeave,
  onOpen,
}: CitationPillProps) {
  return (
    <button
      type="button"
      className="relative inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-primary/15 px-2 text-xs font-medium text-primary transition-colors duration-(--duration-hover) ease-spring before:absolute before:-inset-2 hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Citation ${index}: ${title}`}
      onMouseEnter={(event) => onHover(event.currentTarget)}
      onMouseLeave={onLeave}
      onFocus={(event) => onHover(event.currentTarget)}
      onBlur={onLeave}
      onClick={() => {
        if (canNavigate) {
          onOpen()
        } else {
          onLeave()
        }
      }}
    >
      {index}
    </button>
  )
}
