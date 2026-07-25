import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { VerifyEmailPage } from "src/pages/VerifyEmailPage"

export const Route = createFileRoute("/verify-email")({
	validateSearch: z.object({
		email: z.string().optional(),
	}),
	component: VerifyEmailPage,
})
