import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { AuthShell } from "#/components/auth/AuthShell"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { authClient } from "#/lib/auth-client"

export const Route = createFileRoute("/forgot-password")({
	component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
	const [email, setEmail] = useState("")
	const [message, setMessage] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [pending, setPending] = useState(false)

	async function onSubmit(event: React.FormEvent) {
		event.preventDefault()
		setPending(true)
		setError(null)

		const result = await authClient.requestPasswordReset({
			email,
			redirectTo: "/reset-password",
		})

		setPending(false)

		if (result.error) {
			setError(result.error.message || "Could not send reset email.")
			return
		}

		setMessage("If that email exists, a reset link is on the way.")
	}

	return (
		<AuthShell>
			<div className="space-y-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						Forgot password
					</h1>
					<p className="text-sm text-muted-foreground">
						Enter your email and we will send a reset link.
					</p>
				</div>
				<form className="space-y-4" onSubmit={onSubmit}>
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="rounded-xl"
							required
						/>
					</div>
					{message ? <p className="text-sm text-primary">{message}</p> : null}
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					<Button
						type="submit"
						className="h-11 w-full rounded-[10px]"
						disabled={pending}
					>
						{pending ? "Sending…" : "Send reset link"}
					</Button>
				</form>
				<p className="text-sm text-muted-foreground">
					<Link to="/sign-in" className="text-primary hover:underline">
						Back to sign in
					</Link>
				</p>
			</div>
		</AuthShell>
	)
}
