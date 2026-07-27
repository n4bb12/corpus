export function AppPending() {
  return (
    <div
      className="atmosphere flex min-h-dvh flex-col"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
    </div>
  )
}
