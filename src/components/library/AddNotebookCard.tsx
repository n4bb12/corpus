import { Plus } from "lucide-react"
import { Bezel } from "src/components/ui/Bezel"
import { Spinner } from "src/components/ui/shadcn/spinner"
import { cn } from "src/lib/utils"

export type AddNotebookCardProps = {
  disabled?: boolean
  onClick: () => void
  pending?: boolean
  tall?: boolean
}

export function AddNotebookCard({
  disabled,
  onClick,
  pending = false,
  tall = false,
}: AddNotebookCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={pending || undefined}
      className={cn(
        "group h-full w-full text-left disabled:pointer-events-none disabled:opacity-60",
        tall && "lg:min-h-full",
      )}
      onClick={onClick}
    >
      <Bezel
        className="h-full"
        innerClassName={cn(
          "flex h-full flex-col items-center justify-center gap-4 border border-dashed border-border/80 bg-card/70 p-5 text-center transition-colors duration-(--duration-hover) ease-spring group-hover:border-primary/40 group-hover:bg-muted/40",
          "max-sm:min-h-0 max-sm:flex-row max-sm:justify-start max-sm:gap-3 max-sm:text-left",
          // Tall = featured card (min-h-56) + lg gap-6 + regular card (min-h-42).
          tall ? "min-h-64 lg:min-h-[calc(14rem+1.5rem+10.5rem)]" : "min-h-42",
        )}
      >
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 transition-transform duration-(--duration-hover) ease-spring",
            !pending && "group-hover:-translate-y-0.5 group-hover:scale-105",
          )}
        >
          {pending ? (
            <Spinner aria-label="Creating notebook" className="size-5" />
          ) : (
            <Plus size={22} aria-hidden strokeWidth={1.5} />
          )}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block font-heading text-lg font-semibold tracking-tight text-foreground">
            New notebook
          </span>
          <span className="mt-1.5 block text-sm text-muted-foreground">
            Gather sources and ask questions
          </span>
        </span>
      </Bezel>
    </button>
  )
}
