import { createFileRoute } from "@tanstack/react-router"
import { ClientAuthBoundary } from "src/components/auth/ClientAuthBoundary"
import { LibraryPage } from "src/pages/LibraryPage"
import { z } from "zod"

export const Route = createFileRoute("/")({
  validateSearch: z.object({
    q: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
  }),
  component: LibraryRoute,
})

function LibraryRoute() {
  return (
    <ClientAuthBoundary mode="signed-in">
      <LibraryPage />
    </ClientAuthBoundary>
  )
}
