import { redirect } from "@tanstack/react-router"
import { authClient } from "src/lib/auth-client"

export async function requireSignedIn() {
	const { data } = await authClient.getSession()

	if (!data) {
		throw redirect({ to: "/sign-in" })
	}
}

export async function requireSignedOut() {
	const { data } = await authClient.getSession()

	if (data) {
		throw redirect({ to: "/" })
	}
}
