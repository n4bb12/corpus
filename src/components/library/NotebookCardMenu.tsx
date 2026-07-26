import { MoreHorizontal } from "lucide-react"
import { Button } from "src/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu"

export type NotebookCardMenuProps = {
	label: string
	loading: boolean
	onRename: () => void
	onDelete: () => void
}

export function NotebookCardMenu({
	label,
	loading,
	onRename,
	onDelete,
}: NotebookCardMenuProps) {
	return (
		<div className="absolute top-2 right-2 z-20 max-sm:top-1/2 max-sm:-translate-y-1/2">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="pointer-events-auto rounded-full opacity-100 transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
						aria-label={`Notebook menu for ${label}`}
						disabled={loading}
						onClick={(event) => event.preventDefault()}
					>
						<MoreHorizontal size={18} />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="rounded-xl">
					<DropdownMenuItem
						onClick={(event) => {
							event.stopPropagation()
							onRename()
						}}
					>
						Rename
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onClick={(event) => {
							event.stopPropagation()
							onDelete()
						}}
					>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
