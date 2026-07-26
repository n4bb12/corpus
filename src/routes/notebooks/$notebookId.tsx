import { createFileRoute } from "@tanstack/react-router"
import { requireSignedIn } from "src/lib/auth-guard"
import { NotebookPage } from "src/pages/notebooks/NotebookPage"
import { z } from "zod"

export const Route = createFileRoute("/notebooks/$notebookId")({
	validateSearch: z.object({
		tab: z.enum(["sources", "chat"]).optional(),
	}),
	beforeLoad: () => requireSignedIn(),
	component: NotebookPage,
})
