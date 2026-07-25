import { SignOut, User } from "@phosphor-icons/react"
import { Button } from "src/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu"
import { authClient } from "src/lib/auth-client"

export type AccountMenuProps = {
	email?: string | null
	name?: string | null
}

export function AccountMenu({ email, name }: AccountMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Account"
					className="rounded-[10px]"
				>
					<User size={18} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56 rounded-xl">
				<DropdownMenuLabel className="font-normal">
					<div className="truncate text-sm font-medium">
						{name || "Account"}
					</div>
					{email ? (
						<div className="truncate text-xs text-muted-foreground">
							{email}
						</div>
					) : null}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() =>
						authClient.signOut({
							fetchOptions: {
								onSuccess: () => {
									location.reload()
								},
							},
						})
					}
				>
					<SignOut size={16} className="mr-2" />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
