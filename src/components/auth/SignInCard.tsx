import type { FormEvent } from "react"
import { useState } from "react"
import { GoogleSignInButton } from "src/components/auth/GoogleSignInButton"
import { SignInEmailForm } from "src/components/auth/SignInEmailForm"
import { Separator } from "src/components/ui/separator"
import { authClient } from "src/lib/auth-client"
import {
	setLastSignInMethod,
	useLastSignInMethod,
} from "src/lib/last-sign-in-method"

export function SignInCard() {
	const lastMethod = useLastSignInMethod()
	const [email, setEmail] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [sent, setSent] = useState(false)
	const [pendingEmail, setPendingEmail] = useState(false)
	const [pendingGoogle, setPendingGoogle] = useState(false)

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
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
		<div className="space-y-5 md:space-y-6">
			<div className="space-y-2">
				<h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
					Welcome back
				</h2>
				<p className="text-sm text-muted-foreground">
					Continue your research workspace.
				</p>
			</div>

			<GoogleSignInButton
				highlighted={lastMethod === "google"}
				pending={pendingGoogle}
				onClick={onGoogle}
			/>

			<div className="flex items-center gap-3">
				<Separator className="flex-1" />
				<span className="text-xs tracking-wide text-muted-foreground uppercase">
					or
				</span>
				<Separator className="flex-1" />
			</div>

			<SignInEmailForm
				email={email}
				error={error}
				sent={sent}
				pendingEmail={pendingEmail}
				pendingGoogle={pendingGoogle}
				showLastUsed={lastMethod === "email"}
				onEmailChange={setEmail}
				onSubmit={onSubmit}
			/>
		</div>
	)
}
