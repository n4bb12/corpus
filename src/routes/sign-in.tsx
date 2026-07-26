import { createFileRoute } from "@tanstack/react-router"
import { ClientAuthBoundary } from "src/components/auth/ClientAuthBoundary"
import { SignInPage } from "src/pages/SignInPage"

export const Route = createFileRoute("/sign-in")({
	component: SignInRoute,
})

function SignInRoute() {
	return (
		<ClientAuthBoundary mode="signed-out">
			<SignInPage />
		</ClientAuthBoundary>
	)
}
