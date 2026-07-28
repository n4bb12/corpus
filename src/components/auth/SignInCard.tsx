import { useEffect, useState } from "react"
import { GoogleSignInButton } from "src/components/auth/GoogleSignInButton"
import { SignInEmailForm } from "src/components/auth/SignInEmailForm"
import { Eyebrow } from "src/components/ui/Eyebrow"
import { Separator } from "src/components/ui/shadcn/separator"
import { authClient } from "src/lib/authClient"
import {
  setLastSignInMethod,
  useLastSignInMethod,
} from "src/lib/lastSignInMethod"

export function SignInCard() {
  const lastMethod = useLastSignInMethod()
  const hasSignedInBefore = !!lastMethod
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [pendingEmail, setPendingEmail] = useState(false)
  const [pendingGoogle, setPendingGoogle] = useState(false)

  // OAuth navigates away with pending=true; bfcache restores that state on Back.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) {
        return
      }

      setPendingGoogle(false)
      setPendingEmail(false)
    }

    window.addEventListener("pageshow", onPageShow)

    return () => {
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [])

  async function onSubmit(event: SubmitEvent) {
    event.preventDefault()
    setPendingEmail(true)
    setError(null)
    setSent(false)

    const result = await authClient.signIn.magicLink({
      email,
      callbackURL: "/library",
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
      callbackURL: "/library",
    })
  }

  return (
    <div className="flex h-full flex-col justify-center space-y-6 md:space-y-7">
      <div className="space-y-3">
        <Eyebrow tone="muted">
          {hasSignedInBefore ? "Sign in" : "Sign up"}
        </Eyebrow>
        <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {hasSignedInBefore ? "Welcome back" : "Welcome"}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
          {hasSignedInBefore
            ? "Sign in to open your notebooks."
            : "Sign up to create your first notebook."}
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
