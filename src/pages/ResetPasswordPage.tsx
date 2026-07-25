import { getRouteApi, Link, useNavigate } from "@tanstack/react-router"
import type { SubmitEvent } from "react"
import { useState } from "react"
import { AuthShell } from "src/components/auth/AuthShell"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { authClient } from "src/lib/auth-client"

const routeApi = getRouteApi("/reset-password")

export function ResetPasswordPage() {
	const { token } = routeApi.useSearch()
	const navigate = useNavigate()
	const [password, setPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [pending, setPending] = useState(false)

	async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault()

		if (!token) {
			setError("This reset link is missing a token.")
			return
		}

		setPending(true)
		setError(null)

		const result = await authClient.resetPassword({
			newPassword: password,
			token,
		})

		setPending(false)

		if (result.error) {
			setError(result.error.message || "Could not reset password.")
			return
		}

		await navigate({ to: "/sign-in" })
	}

	return (
		<AuthShell>
			<div className="space-y-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						Reset password
					</h1>
					<p className="text-sm text-muted-foreground">
						Choose a new password for your Corpus account.
					</p>
				</div>
				<form className="space-y-4" onSubmit={onSubmit}>
					<div className="space-y-2">
						<Label htmlFor="password">New password</Label>
						<Input
							id="password"
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className="rounded-xl"
							minLength={8}
							required
						/>
					</div>
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					<Button
						type="submit"
						className="h-11 w-full rounded-sm"
						disabled={pending}
					>
						{pending ? "Saving…" : "Save password"}
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
