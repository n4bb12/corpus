import { createFileRoute } from "@tanstack/react-router"
import { requireSignedOut } from "src/lib/auth-guard"
import { SignInPage } from "src/pages/SignInPage"

export const Route = createFileRoute("/sign-in")({
	beforeLoad: () => requireSignedOut(),
	component: SignInPage,
})
