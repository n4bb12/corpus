import { Link, getRouteApi } from "@tanstack/react-router"
import { useState } from "react"
import { AuthShell } from "src/components/auth/AuthShell"
import { Button } from "src/components/ui/button"
import { authClient } from "src/lib/auth-client"

const routeApi = getRouteApi("/verify-email")

export function VerifyEmailPage() {
	const { email } = routeApi.useSearch()
	const [message, setMessage] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [pending, setPending] = useState(false)

	async function resend() {
		if (!email) {
			setError("Add your email on the sign-up page first.")
			return
		}

		setPending(true)
		setError(null)

		const result = await authClient.sendVerificationEmail({
			email,
			callbackURL: "/",
		})

		setPending(false)

		if (result.error) {
			setError(result.error.message || "Could not resend verification.")
			return
		}

		setMessage("Verification email sent. Check your inbox.")
	}

	return (
		<AuthShell>
			<div className="space-y-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						Verify email
					</h1>
					<p className="text-sm text-muted-foreground">
						We sent a verification link
						{email ? ` to ${email}` : ""}. Open it to finish signing up.
					</p>
				</div>
				{message ? <p className="text-sm text-primary">{message}</p> : null}
				{error ? <p className="text-sm text-destructive">{error}</p> : null}
				<Button
					className="h-11 w-full rounded-sm"
					onClick={resend}
					disabled={pending}
				>
					{pending ? "Sending…" : "Resend verification"}
				</Button>
				<p className="text-sm text-muted-foreground">
					<Link to="/sign-in" className="text-primary hover:underline">
						Back to sign in
					</Link>
				</p>
			</div>
		</AuthShell>
	)
}
