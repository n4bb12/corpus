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
			setError(result.error.message || "Couldn't send a sign-in link.")
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
		<div className="flex h-full flex-col justify-center space-y-6 md:space-y-7">
			<div className="space-y-3">
				<span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
					Sign in
				</span>
				<h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
					Welcome back
				</h2>
				<p className="text-sm leading-relaxed text-muted-foreground md:text-base">
					Sign in to open your notebooks.
				</p>
			</div>

			<GoogleSignInButton
				highlighted={lastMethod === "google"}
				pending={pendingGoogle}
				onClick={onGoogle}
			/>

			<div className="flex items-center gap-3">
				<Separator className="flex-1" />
				<span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
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
