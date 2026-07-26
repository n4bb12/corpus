import { Search, X } from "lucide-react"
import { Input } from "src/components/ui/input"

export type LibrarySearchFieldProps = {
	value: string
	onChange: (value: string) => void
	onClear: () => void
}

export function LibrarySearchField({
	value,
	onChange,
	onClear,
}: LibrarySearchFieldProps) {
	return (
		<div className="relative mb-10 w-full md:mb-12 md:w-96">
			<Search
				size={16}
				strokeWidth={1.5}
				className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="Search notebooks"
				className={
					value
						? "h-11 rounded-full pr-11 pl-11 shadow-(--shadow-pine) ring-1 ring-foreground/4"
						: "h-11 rounded-full pl-11 shadow-(--shadow-pine) ring-1 ring-foreground/4"
				}
				aria-label="Search notebooks"
			/>
			{value ? (
				<button
					type="button"
					className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-all duration-(--duration-hover) ease-spring hover:bg-muted hover:text-foreground"
					aria-label="Clear search"
					onClick={onClear}
				>
					<X size={16} strokeWidth={1.5} />
				</button>
			) : null}
		</div>
	)
}
