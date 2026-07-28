/** Placeholder pills while trailing-paragraph citations are still streaming in. */
export function CitationPillsPending() {
  return (
    <div className="flex flex-wrap gap-2" aria-busy="true">
      <span className="sr-only" role="status">
        Linking sources…
      </span>
      <span
        className="inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-2 text-xs font-medium placeholder-shimmer"
        aria-hidden
      >
        0
      </span>
      <span
        className="inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-2 text-xs font-medium placeholder-shimmer"
        aria-hidden
      >
        0
      </span>
    </div>
  )
}
