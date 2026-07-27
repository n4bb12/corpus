import { LogOut, User } from "lucide-react"
import { useState } from "react"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { Button } from "src/components/ui/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/components/ui/shadcn/dropdown-menu"
import { authClient } from "src/lib/auth-client"
import { beginSignOut } from "src/lib/use-signed-in"

export type AccountMenuProps = {
  email?: string | null
  name?: string | null
}

export function AccountMenu({ email, name }: AccountMenuProps) {
  const [pending, setPending] = useState(false)

  async function onSignOut() {
    setPending(true)
    // Drop query subscriptions before Better Auth clears the Convex token.
    beginSignOut()

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.assign("/sign-in")
        },
        onError: () => {
          setPending(false)
        },
      },
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Account"
          className="rounded-sm"
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
        <DropdownMenuItem disabled={pending} onClick={() => void onSignOut()}>
          <PendingLabel
            pending={pending}
            pendingLabel="Signing out"
            className="w-full justify-start"
          >
            <span className="inline-flex items-center">
              <LogOut size={16} className="mr-2" />
              Sign out
            </span>
          </PendingLabel>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
