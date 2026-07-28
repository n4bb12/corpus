import { Suspense } from "react"
import { ClientAuthBoundary } from "src/components/auth/ClientAuthBoundary"
import { NotebookPage } from "src/components/pages/notebooks/NotebookPage"

/** Static shell; notebook id is read on the client. */
export const dynamic = "force-static"

export function generateStaticParams() {
  return [] as Array<{ notebookId: string }>
}

export default function NotebookRoute() {
  return (
    <Suspense>
      <ClientAuthBoundary mode="signed-in">
        <NotebookPage />
      </ClientAuthBoundary>
    </Suspense>
  )
}
