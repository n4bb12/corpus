import type { FormEvent } from "react"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { PendingLabel } from "src/components/ui/PendingLabel"

export type SignInEmailFormProps = {
	email: string
	error: string | null
	sent: boolean
	pendingEmail: boolean
	pendingGoogle: boolean
	showLastUsed: boolean
	onEmailChange: (value: string) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function SignInEmailForm({
	email,
	error,
	sent,
	pendingEmail,
	pendingGoogle,
	showLastUsed,
	onEmailChange,
	onSubmit,
}: SignInEmailFormProps) {
	return (
		<form className="relative space-y-4" onSubmit={onSubmit}>
			{showLastUsed ? (
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
					onChange={(event) => onEmailChange(event.target.value)}
					className="rounded-xl"
					required
					disabled={pendingEmail || pendingGoogle}
				/>
			</div>
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
			{sent ? (
				<p className="text-sm text-muted-foreground">
					Check your inbox for a sign-in link. It expires in a few minutes.
				</p>
			) : null}
			<Button
				type="submit"
				className="w-full rounded-sm"
				disabled={pendingEmail || pendingGoogle}
			>
				<PendingLabel pending={pendingEmail} pendingLabel="Sending magic link">
					Email me a magic link
				</PendingLabel>
			</Button>
		</form>
	)
}
