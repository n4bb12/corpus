import { Plus } from "lucide-react"
import { Bezel } from "src/components/ui/Bezel"
import { cn } from "src/lib/utils"

export type AddNotebookCardProps = {
  disabled?: boolean
  onClick: () => void
  tall?: boolean
}

export function AddNotebookCard({
  disabled,
  onClick,
  tall = false,
}: AddNotebookCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
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
          tall ? "min-h-[16rem] lg:min-h-[22rem]" : "min-h-[10.5rem]",
        )}
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 transition-transform duration-(--duration-hover) ease-spring group-hover:-translate-y-0.5 group-hover:scale-105">
          <Plus size={22} aria-hidden strokeWidth={1.5} />
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
