import { createFileRoute } from "@tanstack/react-router"
import { requireSignedIn } from "src/lib/auth-guard"
import { LibraryPage } from "src/pages/LibraryPage"
import { z } from "zod"

export const Route = createFileRoute("/")({
	validateSearch: z.object({
		q: z.string().optional(),
		cursor: z.string().optional(),
	}),
	beforeLoad: () => requireSignedIn(),
	component: LibraryPage,
})
