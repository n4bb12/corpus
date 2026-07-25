import { createFileRoute, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { getToken } from "src/lib/auth-server"
import { SignInPage } from "src/pages/SignInPage"

const getAuth = createServerFn({ method: "GET" }).handler(async () =>
	getToken(),
)

export const Route = createFileRoute("/sign-in")({
	beforeLoad: async () => {
		const token = await getAuth()

		if (token) {
			throw redirect({ to: "/" })
		}
	},
	component: SignInPage,
})
