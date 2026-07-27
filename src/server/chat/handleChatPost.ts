import { api } from "src/convex/_generated/api"
import {
  fetchAuthAction,
  fetchAuthMutation,
  fetchAuthQuery,
  getToken,
} from "src/lib/authServer"
import { formatChatError } from "src/lib/chatErrors"
import { CHAT_PROGRESS } from "src/lib/chatProgress"
import { createOpenAiAnswerGenerator } from "src/server/chat/openaiAnswerGenerator"
import {
  type EvidencePack,
  runAnswerTurn,
  type SourceRecord,
} from "src/server/chat/runAnswerTurn"

function encodeSse(event: string, data: unknown) {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  )
}

export async function handleChatPost(request: Request) {
  const token = await getToken()

  if (!token) {
    return Response.json(
      { error: "You need to sign in to continue." },
      { status: 401 },
    )
  }

  const body = (await request.json()) as {
    notebookId: string
    prompt: string
    retryAssistantId?: string
  }

  let prepared: {
    generationId: string
    exchangeId: string
    userMessageId: string
    assistantMessageId: string
    sourceRevision: number
    sourceIds: string[]
    prompt: string
    history: Array<{
      user: { content?: string }
      assistant: { content?: string }
    }>
  }

  try {
    prepared = (await fetchAuthMutation(api.chat.prepareGeneration, {
      notebookId: body.notebookId as never,
      prompt: body.prompt,
      retryAssistantId: body.retryAssistantId as never,
    })) as typeof prepared
  } catch (error) {
    return Response.json(
      {
        error: formatChatError(error),
      },
      { status: 400 },
    )
  }

  const generateAnswer = createOpenAiAnswerGenerator()
  const controller = new AbortController()

  const abortGeneration = () => {
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }

  request.signal.addEventListener("abort", abortGeneration)

  const stream = new ReadableStream({
    cancel() {
      abortGeneration()
    },
    async start(streamController) {
      let fullText = ""
      let lastPersist = 0
      let persistInFlight: Promise<unknown> | null = null
      let settled = false
      let emittedInsufficient: boolean | null = null

      const throwIfCanceled = () => {
        if (controller.signal.aborted) {
          const error = new Error("Canceled")
          error.name = "AbortError"
          throw error
        }
      }

      const haltIfInactive = (active: unknown) => {
        if (active === false) {
          abortGeneration()
          throwIfCanceled()
        }
      }

      const persistLatest = () => {
        if (persistInFlight || controller.signal.aborted) {
          return
        }

        persistInFlight = fetchAuthMutation(api.chat.appendAssistantText, {
          messageId: prepared.assistantMessageId as never,
          generationId: prepared.generationId,
          content: fullText,
        })
          .then((active) => {
            if (active === false) {
              abortGeneration()
            }
          })
          .catch(() => undefined)
          .finally(() => {
            persistInFlight = null
          })
      }

      const emitStatus = async (label: string) => {
        throwIfCanceled()
        streamController.enqueue(encodeSse("status", { label }))
        const active = await fetchAuthMutation(api.chat.setProgressLabel, {
          messageId: prepared.assistantMessageId as never,
          generationId: prepared.generationId,
          progressLabel: label,
        })
        haltIfInactive(active)
      }

      const emitInsufficient = (insufficient: boolean) => {
        if (controller.signal.aborted) {
          return
        }

        if (emittedInsufficient === insufficient) {
          return
        }

        emittedInsufficient = insufficient
        streamController.enqueue(encodeSse("insufficient", { insufficient }))
      }

      const emitText = (nextText: string) => {
        if (controller.signal.aborted) {
          return
        }

        if (nextText === fullText) {
          return
        }

        fullText = nextText
        streamController.enqueue(encodeSse("text", { text: nextText }))
      }

      const finalize = async (args: {
        content: string
        status: "complete" | "failed" | "canceled"
        errorMessage?: string
        insufficient?: boolean
        citations?: Array<{
          sourceId: never
          chunkId: never
          sourceTitleSnapshot: string
          excerpt: string
          locator?: {
            startOffset: number
            endOffset: number
            ordinal: number
          }
          order: number
        }>
      }) => {
        if (settled) {
          return
        }

        settled = true

        try {
          await persistInFlight
          await fetchAuthMutation(api.chat.finalizeAssistant, {
            messageId: prepared.assistantMessageId as never,
            generationId: prepared.generationId,
            content: args.content,
            status: args.status,
            errorMessage: args.errorMessage,
            insufficient: args.insufficient,
            citations: args.citations,
          })
        } catch {
          settled = false
          throw new Error("Couldn't save the answer.")
        }
      }

      try {
        await emitStatus(CHAT_PROGRESS.looking)

        const evidencePack = (await fetchAuthAction(
          api.retrieval.prepareEvidence,
          {
            notebookId: body.notebookId as never,
            prompt: prepared.prompt,
            sourceIds: prepared.sourceIds as never,
            messageId: prepared.assistantMessageId as never,
            generationId: prepared.generationId,
          },
        )) as EvidencePack

        throwIfCanceled()

        if (evidencePack.insufficient) {
          fullText =
            "The selected sources do not support an answer to that question."
          emitInsufficient(true)
          await finalize({
            content: fullText,
            status: "complete",
            insufficient: true,
            citations: [],
          })
          streamController.enqueue(encodeSse("text", { text: fullText }))
          streamController.enqueue(encodeSse("done", {}))
          streamController.close()
          return
        }

        const evidenceSourceIds = [
          ...new Set(evidencePack.evidence.map((item) => item.sourceId)),
        ]
        const titleSourceIds = [
          ...new Set([...prepared.sourceIds, ...evidenceSourceIds]),
        ]
        const sources = await Promise.all(
          titleSourceIds.map(async (sourceId) => {
            throwIfCanceled()
            const source = await fetchAuthQuery(api.sources.get, {
              sourceId: sourceId as never,
            }).catch(() => null)

            return { sourceId, source }
          }),
        )
        throwIfCanceled()
        const sourcesById = new Map<string, SourceRecord | null | undefined>(
          sources.map(({ sourceId, source }) => [
            sourceId,
            source as SourceRecord | null,
          ]),
        )
        const sourceTitleById = new Map(
          sources.map(({ sourceId, source }) => [
            sourceId,
            typeof source?.title === "string" ? source.title : "",
          ]),
        )

        await emitStatus(CHAT_PROGRESS.writing)

        const turn = await runAnswerTurn({
          evidencePack,
          sourceIds: prepared.sourceIds,
          sourcesById,
          sourceTitleById,
          history: prepared.history,
          prompt: prepared.prompt,
          generateAnswer,
          abortSignal: controller.signal,
          throwIfCanceled,
          onPartial: {
            insufficient: emitInsufficient,
            text: (text) => {
              emitText(text)

              const now = Date.now()

              if (now - lastPersist > 400) {
                lastPersist = now
                persistLatest()
              }
            },
            citations: (citations) => {
              streamController.enqueue(encodeSse("citations", { citations }))
            },
          },
        })

        throwIfCanceled()

        if (turn.status === "failed") {
          await finalize({
            content: turn.content,
            status: "failed",
            insufficient: false,
            errorMessage: turn.errorMessage,
          })
          streamController.enqueue(
            encodeSse("error", {
              message:
                turn.errorMessage ??
                "The answer couldn't be verified against your sources. Try again.",
            }),
          )
          streamController.close()
          return
        }

        if (turn.content !== fullText.trim()) {
          emitText(turn.content)
        }

        await finalize({
          content: turn.content,
          status: "complete",
          insufficient: turn.insufficient,
          citations: turn.citations.map((citation) => ({
            sourceId: citation.sourceId as never,
            chunkId: citation.chunkId as never,
            sourceTitleSnapshot: citation.sourceTitleSnapshot,
            excerpt: citation.excerpt,
            locator: citation.locator,
            order: citation.order,
          })),
        })

        streamController.enqueue(encodeSse("done", {}))
        streamController.close()
      } catch (error) {
        const canceled = controller.signal.aborted
        const message = formatChatError(error)

        try {
          await finalize({
            content: fullText,
            status: canceled ? "canceled" : "failed",
            errorMessage: canceled ? undefined : message,
          })
        } catch {
          // Client will mark the turn failed if persistence fails.
        }

        try {
          if (!canceled) {
            streamController.enqueue(
              encodeSse("error", {
                message,
              }),
            )
          }

          streamController.close()
        } catch {
          try {
            streamController.error(
              error instanceof Error ? error : new Error(message),
            )
          } catch {
            // Stream may already be closed.
          }
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
