import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useState } from "react"
import { AuthShell } from "#/components/auth/AuthShell"
import { GoogleSignInButton } from "#/components/auth/GoogleSignInButton"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { Separator } from "#/components/ui/separator"
import { authClient } from "#/lib/auth-client"
import { getToken } from "#/lib/auth-server"
import {
	setLastSignInMethod,
	useLastSignInMethod,
} from "#/lib/last-sign-in-method"
import { cn } from "#/lib/utils"

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
	const lastMethod = useLastSignInMethod()
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

		setLastSignInMethod("email")
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

				<GoogleSignInButton
					highlighted={lastMethod === "google"}
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

				<form
					className={cn(
						"relative space-y-4 rounded-md p-1",
						lastMethod === "email" &&
							"ring-2 ring-primary ring-offset-2 ring-offset-background",
					)}
					onSubmit={onSubmit}
				>
					{lastMethod === "email" ? (
						<span className="absolute -top-2 right-3 z-10 rounded-md bg-primary px-2 py-0.5 text-xs font-medium tracking-wide text-primary-foreground uppercase">
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
