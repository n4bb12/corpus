import { Mail } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { IslandCta } from "src/components/ui/IslandCta"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { Alert, AlertDescription } from "src/components/ui/shadcn/alert"
import { Input } from "src/components/ui/shadcn/input"
import { Label } from "src/components/ui/shadcn/label"
import { fadeTransition, respectReducedMotion } from "src/lib/motion"

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
  const reduceMotion = useReducedMotion()
  const transition = respectReducedMotion(reduceMotion, fadeTransition)

  return (
    <form
      className="flex flex-col"
      onSubmit={(event) => onSubmit(event.nativeEvent)}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>

        <div className="relative">
          {showLastUsed ? (
            <span className="absolute -top-2 -right-1 z-10 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium tracking-wide text-background uppercase">
              Last used
            </span>
          ) : null}

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
      </div>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.div
            key="signin-email-error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={transition}
            className="overflow-hidden"
          >
            <p className="pt-4 text-sm text-destructive">{error}</p>
          </motion.div>
        ) : null}

        {sent ? (
          <motion.div
            key="signin-email-sent"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={transition}
            className="overflow-hidden"
          >
            <Alert className="mt-4">
              <Mail aria-hidden />
              <AlertDescription>
                Check your inbox for a sign-in link. It expires in a few
                minutes.
              </AlertDescription>
            </Alert>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <IslandCta
        type="submit"
        className="mt-4 w-full justify-between"
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
