import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleChatPost } = await import(
          "src/server/chat/handleChatPost"
        )

        return handleChatPost(request)
      },
    },
  },
})
