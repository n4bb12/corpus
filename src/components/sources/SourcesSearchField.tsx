import { Search, X } from "lucide-react"
import { Input } from "src/components/ui/shadcn/input"

export type SourcesSearchFieldProps = {
  query: string
  onQueryChange: (value: string) => void
}

export function SourcesSearchField({
  query,
  onQueryChange,
}: SourcesSearchFieldProps) {
  return (
    <div className="relative">
      <Search
        size={14}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search sources"
        className={query ? "rounded-xl pr-9 pl-9" : "rounded-xl pl-9"}
        aria-label="Search sources"
      />
      {query ? (
        <button
          type="button"
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-(--duration-hover) ease-spring hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
          onClick={() => onQueryChange("")}
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  )
}
