import type { SubmitEvent } from "react"
import { useState } from "react"
import { AuthShell } from "src/components/auth/AuthShell"
import { GoogleSignInButton } from "src/components/auth/GoogleSignInButton"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { Separator } from "src/components/ui/separator"
import { authClient } from "src/lib/auth-client"
import {
	setLastSignInMethod,
	useLastSignInMethod,
} from "src/lib/last-sign-in-method"
import { cn } from "src/lib/utils"

export function SignInPage() {
	const lastMethod = useLastSignInMethod()
	const [email, setEmail] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [sent, setSent] = useState(false)
	const [pendingEmail, setPendingEmail] = useState(false)
	const [pendingGoogle, setPendingGoogle] = useState(false)

	async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault()
		setPendingEmail(true)
		setError(null)
		setSent(false)

		const result = await authClient.signIn.magicLink({
			email,
			callbackURL: "/",
		})

		setPendingEmail(false)

		if (result.error) {
			setError(result.error.message || "Could not send magic link.")
			return
		}

		setLastSignInMethod("email")
		setSent(true)
	}

	function onGoogle() {
		setPendingGoogle(true)
		setLastSignInMethod("google")
		void authClient.signIn.social({
			provider: "google",
			callbackURL: "/",
		})
	}

	return (
		<AuthShell>
			<div className="space-y-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
					<p className="text-sm text-muted-foreground">
						Continue with Google or a magic link to your email.
					</p>
				</div>

				<GoogleSignInButton
					highlighted={lastMethod === "google"}
					pending={pendingGoogle}
					onClick={onGoogle}
				/>

				<div className="flex items-center gap-3">
					<Separator className="flex-1" />
					<span className="text-xs uppercase tracking-wide text-muted-foreground">
						or
					</span>
					<Separator className="flex-1" />
				</div>

				<form
					className={cn(
						"relative space-y-4 rounded-sm p-1",
						lastMethod === "email" &&
							"ring-2 ring-primary ring-offset-2 ring-offset-background",
					)}
					onSubmit={onSubmit}
				>
					{lastMethod === "email" ? (
						<span className="absolute -top-2 right-3 z-10 rounded-sm bg-primary px-2 py-0.5 text-xs font-medium tracking-wide text-primary-foreground uppercase">
							Last used
						</span>
					) : null}
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							autoComplete="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="rounded-xl"
							required
							disabled={pendingEmail || pendingGoogle}
						/>
					</div>
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					{sent ? (
						<p className="text-sm text-muted-foreground">
							Check your inbox for a sign-in link. It expires in a few minutes.
						</p>
					) : null}
					<Button
						type="submit"
						className="h-11 w-full rounded-sm"
						disabled={pendingEmail || pendingGoogle}
					>
						<PendingLabel
							pending={pendingEmail}
							pendingLabel="Sending magic link"
						>
							Email me a magic link
						</PendingLabel>
					</Button>
				</form>
			</div>
		</AuthShell>
	)
}
