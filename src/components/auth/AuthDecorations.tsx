export function AuthDecorations() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
		>
			<div className="absolute -top-32 -left-20 size-[32rem] rounded-full bg-primary/6 blur-3xl" />
			<div className="absolute top-1/2 -right-28 size-[28rem] -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
			<div className="absolute -bottom-40 left-1/3 size-[24rem] rounded-full bg-primary/4 blur-3xl" />
		</div>
	)
}
