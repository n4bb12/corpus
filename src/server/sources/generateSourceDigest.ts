import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { requireEnv } from "src/lib/env"
import { MODELS } from "src/lib/limits"
import {
  DIGEST_MAX_INPUT_CHARS,
  DIGEST_MAX_OUTPUT_TOKENS,
  DIGEST_TARGET_MAX_CHARS,
  DIGEST_TARGET_MIN_CHARS,
  type DigestChunk,
  digestFromModelText,
  tryCheapSourceDigest,
} from "src/lib/sourceDigest"

function packChunksForPrompt(chunks: DigestChunk[]) {
  let used = 0
  const parts: string[] = []

  for (const chunk of chunks) {
    if (used + chunk.text.length > DIGEST_MAX_INPUT_CHARS && parts.length) {
      break
    }

    parts.push(chunk.text)
    used += chunk.text.length + 2
  }

  return parts.join("\n\n")
}

export async function generateSourceDigest(args: {
  sourceTitle: string
  markdown: string
  chunks: DigestChunk[]
}) {
  const cheap = tryCheapSourceDigest({
    markdown: args.markdown,
    chunks: args.chunks,
  })

  if (cheap) {
    return cheap
  }

  const packed =
    packChunksForPrompt(args.chunks) ||
    args.markdown.slice(0, DIGEST_MAX_INPUT_CHARS)

  if (!packed.trim()) {
    return null
  }

  const openai = createOpenAI({
    apiKey: requireEnv("OPENAI_API_KEY"),
  })

  const result = await generateText({
    model: openai(MODELS.digest),
    system: `You write grounded digests of a single source for a multi-source notebook.
Return only a concise markdown summary of the source (${DIGEST_TARGET_MIN_CHARS}–${DIGEST_TARGET_MAX_CHARS} characters). Cover the main claims, topics, and purpose. Do not invent facts. No preamble, title, or citations.`,
    prompt: `Source title: ${args.sourceTitle || "Untitled"}

Source text:
${packed}`,
    maxOutputTokens: DIGEST_MAX_OUTPUT_TOKENS,
    providerOptions: {
      openai: {
        reasoningEffort: "none",
      },
    },
  })

  return digestFromModelText(result.text, args.chunks)
}
