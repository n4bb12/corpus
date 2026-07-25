import { createFileRoute } from "@tanstack/react-router"
import { ResetPasswordPage } from "src/pages/ResetPasswordPage"
import { z } from "zod"

export const Route = createFileRoute("/reset-password")({
	validateSearch: z.object({
		token: z.string().optional(),
	}),
	component: ResetPasswordPage,
})
