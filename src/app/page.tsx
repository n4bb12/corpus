import { Suspense } from "react"
import { ClientAuthBoundary } from "src/components/auth/ClientAuthBoundary"
import { LibraryPage } from "src/components/pages/LibraryPage"

export const dynamic = "force-static"

export default function LibraryRoute() {
  return (
    <Suspense>
      <ClientAuthBoundary mode="signed-in">
        <LibraryPage />
      </ClientAuthBoundary>
    </Suspense>
  )
}
