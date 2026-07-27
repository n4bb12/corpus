import { createFileRoute } from "@tanstack/react-router"
import { handler } from "src/lib/authServer"

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handler(request),
      POST: ({ request }) => handler(request),
    },
  },
})
