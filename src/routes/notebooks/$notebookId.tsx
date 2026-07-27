import { createFileRoute } from "@tanstack/react-router"
import { ClientAuthBoundary } from "src/components/auth/ClientAuthBoundary"
import { NotebookPage } from "src/pages/notebooks/NotebookPage"
import { z } from "zod"

export const Route = createFileRoute("/notebooks/$notebookId")({
  ssr: false,
  validateSearch: z.object({
    tab: z.enum(["sources", "chat"]).optional(),
  }),
  component: NotebookRoute,
})

function NotebookRoute() {
  return (
    <ClientAuthBoundary mode="signed-in">
      <NotebookPage />
    </ClientAuthBoundary>
  )
}
