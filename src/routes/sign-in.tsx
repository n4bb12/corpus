import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useState } from "react"
import { AuthShell } from "#/components/auth/AuthShell"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { Separator } from "#/components/ui/separator"
import { authClient } from "#/lib/auth-client"
import { getToken } from "#/lib/auth-server"

const getAuth = createServerFn({ method: "GET" }).handler(async () =>
	getToken(),
)

export const Route = createFileRoute("/sign-in")({
	beforeLoad: async () => {
		const token = await getAuth()

		if (token) {
			throw redirect({ to: "/" })
		}
	},
	component: SignInPage,
})

function SignInPage() {
	const navigate = useNavigate()
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [pending, setPending] = useState(false)

	async function onSubmit(event: React.FormEvent) {
		event.preventDefault()
		setPending(true)
		setError(null)

		const result = await authClient.signIn.email({
			email,
			password,
		})

		setPending(false)

		if (result.error) {
			setError(result.error.message || "Could not sign in.")
			return
		}

		await navigate({ to: "/" })
	}

	return (
		<AuthShell>
			<div className="space-y-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
					<p className="text-sm text-muted-foreground">
						Continue with Google or your verified email.
					</p>
				</div>

				<Button
					type="button"
					variant="outline"
					className="h-11 w-full rounded-[10px]"
					onClick={() =>
						authClient.signIn.social({
							provider: "google",
							callbackURL: "/",
						})
					}
				>
					Continue with Google
				</Button>

				<div className="flex items-center gap-3">
					<Separator className="flex-1" />
					<span className="text-xs uppercase tracking-wide text-muted-foreground">
						or
					</span>
					<Separator className="flex-1" />
				</div>

				<form className="space-y-4" onSubmit={onSubmit}>
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
						/>
					</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between gap-3">
							<Label htmlFor="password">Password</Label>
							<Link
								to="/forgot-password"
								className="text-xs text-primary hover:underline"
							>
								Forgot password?
							</Link>
						</div>
						<Input
							id="password"
							type="password"
							autoComplete="current-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className="rounded-xl"
							required
						/>
					</div>
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					<Button
						type="submit"
						className="h-11 w-full rounded-[10px]"
						disabled={pending}
					>
						{pending ? "Signing in…" : "Sign in"}
					</Button>
				</form>

				<p className="text-sm text-muted-foreground">
					Need an account?{" "}
					<Link to="/sign-up" className="text-primary hover:underline">
						Sign up
					</Link>
				</p>
			</div>
		</AuthShell>
	)
}
