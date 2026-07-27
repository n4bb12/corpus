import { createOpenAI } from "@ai-sdk/openai"
import { generateText, Output } from "ai"
import { requireEnv } from "src/lib/env"
import { MODELS } from "src/lib/limits"
import {
  clampDigestText,
  DIGEST_MAX_CITATIONS,
  DIGEST_TARGET_MAX_CHARS,
  DIGEST_TARGET_MIN_CHARS,
  type DigestChunk,
  type DigestCitation,
  validateDigestCitations,
} from "src/lib/sourceDigest"
import { z } from "zod"

const digestSchema = z.object({
  digestText: z.string(),
  citations: z.array(
    z.object({
      chunkId: z.string(),
      quote: z.string(),
    }),
  ),
})

const MAX_DIGEST_INPUT_CHARS = 24_000

function packChunksForPrompt(chunks: DigestChunk[]) {
  let used = 0
  const lines: string[] = []

  for (const chunk of chunks) {
    const block = `[chunk:${chunk.chunkId} ordinal:${chunk.ordinal}]\n${chunk.text}`

    if (used + block.length > MAX_DIGEST_INPUT_CHARS && lines.length) {
      break
    }

    lines.push(block)
    used += block.length
  }

  return lines.join("\n\n")
}

export async function generateSourceDigest(args: {
  sourceTitle: string
  markdown: string
  chunks: DigestChunk[]
}) {
  const chunksById = new Map(
    args.chunks.map((chunk) => [chunk.chunkId, chunk] as const),
  )
  const packed =
    packChunksForPrompt(args.chunks) ||
    args.markdown.slice(0, MAX_DIGEST_INPUT_CHARS)

  if (!packed.trim()) {
    return null
  }

  const openai = createOpenAI({
    apiKey: requireEnv("OPENAI_API_KEY"),
  })

  const result = await generateText({
    model: openai(MODELS.digest),
    system: `You write grounded digests of a single source for a multi-source notebook.
Return digestText: a concise markdown summary of the source (${DIGEST_TARGET_MIN_CHARS}–${DIGEST_TARGET_MAX_CHARS} characters). Cover the main claims, topics, and purpose. Do not invent facts.
Also return citations: up to ${DIGEST_MAX_CITATIONS} supporting quotes. Each citation must use a chunkId from the supplied chunks and a short verbatim quote copied from that chunk (one sentence or less).
Prefer quotes that back the most important points in the digest.`,
    prompt: `Source title: ${args.sourceTitle || "Untitled"}

Chunks:
${packed}`,
    output: Output.object({ schema: digestSchema }),
  })

  const output = result.output

  if (!output?.digestText?.trim()) {
    return null
  }

  const digestText = clampDigestText(output.digestText)
  const citations: DigestCitation[] = validateDigestCitations(
    output.citations ?? [],
    chunksById,
  )

  if (!digestText) {
    return null
  }

  return { digestText, citations }
}
