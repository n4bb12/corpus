import { ClientAuthBoundary } from "src/components/auth/ClientAuthBoundary"
import { SignInPage } from "src/components/pages/SignInPage"

export const dynamic = "force-static"

export default function SignInRoute() {
  return (
    <ClientAuthBoundary mode="signed-out">
      <SignInPage />
    </ClientAuthBoundary>
  )
}
