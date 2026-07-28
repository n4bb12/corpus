import { handleChatPost } from "src/server/chat/handleChatPost"

export const maxDuration = 300
export const preferredRegion = "fra1"

export async function POST(request: Request) {
  return handleChatPost(request)
}
