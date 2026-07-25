import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import type { SubmitEvent } from "react"
import { useState } from "react"
import { AuthShell } from "src/components/auth/AuthShell"
import { GoogleSignInButton } from "src/components/auth/GoogleSignInButton"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Separator } from "src/components/ui/separator"
import { authClient } from "src/lib/auth-client"
import { getToken } from "src/lib/auth-server"
import { setLastSignInMethod } from "src/lib/last-sign-in-method"

const getAuth = createServerFn({ method: "GET" }).handler(async () =>
	getToken(),
)

export const Route = createFileRoute("/sign-up")({
	beforeLoad: async () => {
		const token = await getAuth()

		if (token) {
			throw redirect({ to: "/" })
		}
	},
	component: SignUpPage,
})

function SignUpPage() {
	const navigate = useNavigate()
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [pending, setPending] = useState(false)

	async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault()
		setPending(true)
		setError(null)

		const result = await authClient.signUp.email({
			name,
			email,
			password,
		})

		setPending(false)

		if (result.error) {
			setError(result.error.message || "Could not create your account.")
			return
		}

		setLastSignInMethod("email")
		await navigate({
			to: "/verify-email",
			search: { email },
		})
	}

	return (
		<AuthShell>
			<div className="space-y-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						Create account
					</h1>
					<p className="text-sm text-muted-foreground">
						Google first, or sign up with email and verify it.
					</p>
				</div>

				<GoogleSignInButton
					onClick={() => {
						setLastSignInMethod("google")
						authClient.signIn.social({
							provider: "google",
							callbackURL: "/",
						})
					}}
				/>

				<div className="flex items-center gap-3">
					<Separator className="flex-1" />
					<span className="text-xs uppercase tracking-wide text-muted-foreground">
						or
					</span>
					<Separator className="flex-1" />
				</div>

				<form className="space-y-4" onSubmit={onSubmit}>
					<div className="space-y-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							className="rounded-xl"
							required
						/>
					</div>
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
					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
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
						{pending ? "Creating…" : "Create account"}
					</Button>
				</form>

				<p className="text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link to="/sign-in" className="text-primary hover:underline">
						Sign in
					</Link>
				</p>
			</div>
		</AuthShell>
	)
}
