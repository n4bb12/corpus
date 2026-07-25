import { createFileRoute, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { getToken } from "src/lib/auth-server"
import { LibraryPage } from "src/pages/LibraryPage"
import { z } from "zod"

const getAuth = createServerFn({ method: "GET" }).handler(async () =>
	getToken(),
)

export const Route = createFileRoute("/")({
	validateSearch: z.object({
		q: z.string().optional(),
		cursor: z.string().optional(),
	}),
	beforeLoad: async () => {
		const token = await getAuth()

		if (!token) {
			throw redirect({ to: "/sign-in" })
		}
	},
	component: LibraryPage,
})
