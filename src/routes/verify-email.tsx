import { createFileRoute } from "@tanstack/react-router"
import { VerifyEmailPage } from "src/pages/VerifyEmailPage"
import { z } from "zod"

export const Route = createFileRoute("/verify-email")({
	validateSearch: z.object({
		email: z.string().optional(),
	}),
	component: VerifyEmailPage,
})
