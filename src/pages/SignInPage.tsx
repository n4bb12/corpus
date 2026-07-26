import { motion, useReducedMotion } from "motion/react"
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
import { layoutTransition } from "src/lib/motion"
import { cn } from "src/lib/utils"

export function SignInPage() {
	const lastMethod = useLastSignInMethod()
	const reduceMotion = useReducedMotion()
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
			<div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
				<motion.div
					className="space-y-4 text-center lg:text-left"
					initial={reduceMotion ? false : { opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={layoutTransition}
				>
					<p className="font-heading text-sm tracking-[0.18em] text-primary uppercase">
						Grounded research notebooks
					</p>
					<h1 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
						Turn your sources into answers you can trust.
					</h1>
					<p className="mx-auto max-w-xl text-base text-muted-foreground md:text-lg lg:mx-0">
						Corpus is a calm place to collect reading, ask precise questions,
						and follow every claim back to the passage that supports it.
					</p>
				</motion.div>

				<motion.div
					className="mx-auto flex w-full max-w-[22rem] flex-col justify-center rounded-2xl border border-border bg-card p-5 shadow-(--shadow-pine) sm:max-w-[26rem] sm:p-6 md:max-w-[30rem] md:aspect-2/3 md:p-10 lg:mx-0 lg:max-w-none lg:p-12"
					initial={reduceMotion ? false : { opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...layoutTransition, delay: reduceMotion ? 0 : 0.08 }}
				>
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
								<span className="absolute -top-1.5 -right-1 z-10 rounded-sm bg-foreground px-1.5 py-px text-[10px] font-medium tracking-wide text-background uppercase">
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
							{error ? (
								<p className="text-sm text-destructive">{error}</p>
							) : null}
							{sent ? (
								<p className="text-sm text-muted-foreground">
									Check your inbox for a sign-in link. It expires in a few
									minutes.
								</p>
							) : null}
							<Button
								type="submit"
								className="w-full rounded-sm"
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
				</motion.div>
			</div>
		</AuthShell>
	)
}
