import { createOpenAI } from "@ai-sdk/openai"
import { generateText, Output } from "ai"
import { requireEnv } from "src/lib/env"
import { MODELS } from "src/lib/limits"
import type { TitleGenerator } from "src/lib/notebookTitleFromSources"
import { z } from "zod"

const titleSchema = z.object({
  title: z.string(),
})

export function createOpenAITitleGenerator(): TitleGenerator {
  return {
    async generateOnce({ prompt }) {
      const openai = createOpenAI({
        apiKey: requireEnv("OPENAI_API_KEY"),
      })

      const result = await generateText({
        model: openai(MODELS.title),
        prompt,
        output: Output.object({ schema: titleSchema }),
      })

      const title = result.output?.title?.trim()

      if (!title) {
        return null
      }

      return { title }
    },
  }
}
