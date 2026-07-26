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
		<div className="relative mb-8 w-full md:w-80">
			<Search
				size={16}
				className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="Search notebooks"
				className={value ? "rounded-xl pr-9 pl-9" : "rounded-xl pl-9"}
				aria-label="Search notebooks"
			/>
			{value ? (
				<button
					type="button"
					className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label="Clear search"
					onClick={onClear}
				>
					<X size={16} />
				</button>
			) : null}
		</div>
	)
}
