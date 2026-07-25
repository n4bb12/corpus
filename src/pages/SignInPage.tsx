import { BookMarked, Link2, Sparkles } from "lucide-react"
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

const FEATURES = [
	{
		icon: Link2,
		title: "Bring your sources",
		body: "Drop in URLs, files, or pasted notes. Corpus normalizes them into a notebook you can search and chat over.",
	},
	{
		icon: Sparkles,
		title: "Ask grounded questions",
		body: "Answers stay tethered to ready, selected sources. If the evidence is thin, Corpus says so instead of inventing.",
	},
	{
		icon: BookMarked,
		title: "Open the exact passage",
		body: "Every citation jumps to the paragraph that earned it, so you can verify and keep researching.",
	},
] as const

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
			<div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,24rem)] lg:gap-14">
				<motion.div
					className="space-y-8 text-center lg:text-left"
					initial={reduceMotion ? false : { opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={layoutTransition}
				>
					<div className="space-y-4">
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
					</div>

					<ul className="grid gap-4 text-left sm:grid-cols-3 lg:grid-cols-1">
						{FEATURES.map((feature, index) => {
							const Icon = feature.icon

							return (
								<motion.li
									key={feature.title}
									className="rounded-2xl border border-border/70 bg-card/55 p-4 backdrop-blur-sm"
									initial={reduceMotion ? false : { opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{
										...layoutTransition,
										delay: reduceMotion ? 0 : 0.08 * (index + 1),
									}}
								>
									<div className="mb-3 flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
										<Icon size={18} aria-hidden />
									</div>
									<h2 className="text-sm font-semibold tracking-tight">
										{feature.title}
									</h2>
									<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
										{feature.body}
									</p>
								</motion.li>
							)
						})}
					</ul>
				</motion.div>

				<motion.div
					className="mx-auto w-full max-w-[28rem] rounded-2xl border border-border bg-card p-6 shadow-(--shadow-pine) lg:mx-0"
					initial={reduceMotion ? false : { opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...layoutTransition, delay: reduceMotion ? 0 : 0.12 }}
				>
					<div className="space-y-6">
						<div className="space-y-2">
							<h2 className="text-2xl font-semibold tracking-tight">
								Sign in to continue
							</h2>
							<p className="text-sm text-muted-foreground">
								Use Google or a magic link. New accounts are created
								automatically.
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
				</motion.div>
			</div>
		</AuthShell>
	)
}
