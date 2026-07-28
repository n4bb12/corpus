"use client"

import { LogOut, User } from "lucide-react"
import { useRouter } from "next/navigation"
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
import { authClient } from "src/lib/authClient"
import {
  beginSignOut,
  endSignOut,
  settleSignOutQueries,
} from "src/lib/useSignedIn"

export type AccountMenuProps = {
  email?: string | null
  name?: string | null
}

export function AccountMenu({ email, name }: AccountMenuProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onSignOut() {
    setPending(true)

    // Flag first so the sign-in boundary won't bounce us back to `/`, then
    // navigate before token clear. ClientAuthBoundary paints SignInPage on the
    // signed-in route only as a fallback if this navigate is slow.
    beginSignOut()
    router.replace("/sign-in")
    await settleSignOutQueries()

    await authClient.signOut({
      fetchOptions: {
        onError: () => {
          endSignOut()
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
