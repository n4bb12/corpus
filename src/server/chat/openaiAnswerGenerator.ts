import { createOpenAI } from "@ai-sdk/openai"
import { generateText, Output, streamText } from "ai"
import { requireEnv } from "src/lib/env"
import { MODELS } from "src/lib/limits"
import {
  type AnswerGenerator,
  answerSchema,
} from "src/server/chat/runAnswerTurn"

const answerOutput = Output.object({ schema: answerSchema })

export function createOpenAiAnswerGenerator(): AnswerGenerator {
  const openai = createOpenAI({
    apiKey: requireEnv("OPENAI_API_KEY"),
  })

  return {
    stream(args) {
      const result = streamText({
        model: openai(MODELS.chat),
        system: args.system,
        prompt: args.prompt,
        abortSignal: args.abortSignal,
        output: answerOutput,
      })

      return {
        partials: result.partialOutputStream,
        output: result.output.then((value) => value ?? null),
      }
    },

    async generateOnce(args) {
      const retry = await generateText({
        model: openai(MODELS.chat),
        system: args.system,
        prompt: args.prompt,
        abortSignal: args.abortSignal,
        output: answerOutput,
      })

      return retry.output ?? null
    },
  }
}
