import { createFileRoute, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { getToken } from "src/lib/auth-server"
import { NotebookPage } from "src/pages/notebooks/NotebookPage"
import { z } from "zod"

const getAuth = createServerFn({ method: "GET" }).handler(async () =>
	getToken(),
)

export const Route = createFileRoute("/notebooks/$notebookId")({
	validateSearch: z.object({
		tab: z.enum(["sources", "chat"]).optional(),
	}),
	beforeLoad: async () => {
		const token = await getAuth()

		if (!token) {
			throw redirect({ to: "/sign-in" })
		}
	},
	component: NotebookPage,
})
