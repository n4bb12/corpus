/** Placeholder pills while trailing-paragraph citations are still streaming in. */
export function CitationPillsPending() {
  return (
    <div className="flex flex-wrap gap-2" aria-busy="true">
      <span className="sr-only" role="status">
        Linking sources…
      </span>
      <span
        className="inline-flex size-6 shrink-0 rounded-full placeholder-shimmer"
        aria-hidden
      />
      <span
        className="inline-flex size-6 shrink-0 rounded-full placeholder-shimmer"
        aria-hidden
      />
    </div>
  )
}
