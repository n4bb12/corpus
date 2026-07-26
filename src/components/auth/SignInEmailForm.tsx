import { IslandCta } from "src/components/ui/IslandCta"
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
	onSubmit: (event: SubmitEvent) => void
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
		<form
			className="relative space-y-4"
			onSubmit={(event) => onSubmit(event.nativeEvent)}
		>
			{showLastUsed ? (
				<span className="absolute -top-2 -right-1 z-10 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium tracking-wide text-background uppercase">
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
					className="h-11 rounded-full px-4"
					required
					disabled={pendingEmail || pendingGoogle}
				/>
			</div>
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
			{sent ? (
				<p className="text-sm leading-relaxed text-muted-foreground">
					Check your inbox for a sign-in link. It expires in a few minutes.
				</p>
			) : null}
			<IslandCta
				type="submit"
				className="w-full justify-between"
				disabled={pendingEmail || pendingGoogle}
			>
				<PendingLabel
					pending={pendingEmail}
					pendingLabel="Sending sign-in link"
				>
					Email me a sign-in link
				</PendingLabel>
			</IslandCta>
		</form>
	)
}
