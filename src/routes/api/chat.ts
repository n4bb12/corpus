import { createOpenAI } from "@ai-sdk/openai"
import { createFileRoute } from "@tanstack/react-router"
import { generateText, smoothStream, streamText } from "ai"
import { api } from "src/convex/_generated/api"
import {
	fetchAuthAction,
	fetchAuthMutation,
	getToken,
} from "src/lib/auth-server"
import { formatChatError } from "src/lib/chat_errors"
import { CHAT_PROGRESS } from "src/lib/chat_progress"
import {
	parseCitationMarkers,
	remapCitationMarkers,
	validateCitations,
} from "src/lib/citations"
import { requireEnv } from "src/lib/env"
import { MODELS } from "src/lib/limits"

function encodeSse(event: string, data: unknown) {
	return new TextEncoder().encode(
		`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
	)
}

export const Route = createFileRoute("/api/chat")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const token = await getToken()

				if (!token) {
					return Response.json({ error: "Unauthorized" }, { status: 401 })
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

				const openai = createOpenAI({
					apiKey: requireEnv("OPENAI_API_KEY"),
				})

				const controller = new AbortController()

				request.signal.addEventListener("abort", () => {
					controller.abort()
				})

				const stream = new ReadableStream({
					async start(streamController) {
						let fullText = ""
						let lastPersist = 0
						let settled = false

						const emitStatus = async (label: string) => {
							streamController.enqueue(encodeSse("status", { label }))
							await fetchAuthMutation(api.chat.setProgressLabel, {
								messageId: prepared.assistantMessageId as never,
								generationId: prepared.generationId,
								progressLabel: label,
							})
						}

						const finalize = async (args: {
							content: string
							status: "complete" | "failed" | "canceled"
							errorMessage?: string
							citations?: Array<{
								sourceId: never
								chunkId: never
								sourceTitleSnapshot: string
								excerpt: string
								order: number
							}>
						}) => {
							if (settled) {
								return
							}

							settled = true

							try {
								await fetchAuthMutation(api.chat.finalizeAssistant, {
									messageId: prepared.assistantMessageId as never,
									generationId: prepared.generationId,
									content: args.content,
									status: args.status,
									errorMessage: args.errorMessage,
									citations: args.citations,
								})
							} catch {
								settled = false
								throw new Error("Could not save the chat response.")
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
							)) as {
								evidence: Array<{
									chunkId: string
									sourceId: string
									text: string
									score: number
									startOffset: number
									endOffset: number
									ordinal: number
								}>
								insufficient: boolean
							}

							const evidenceBlock = evidencePack.evidence
								.map(
									(
										item: (typeof evidencePack.evidence)[number],
										index: number,
									) =>
										`[${index + 1}] chunk:${item.chunkId} source:${item.sourceId}\n${item.text}`,
								)
								.join("\n\n")

							const historyText = prepared.history
								.map(
									(pair: (typeof prepared.history)[number]) =>
										`User: ${pair.user.content ?? ""}\nAssistant: ${pair.assistant.content ?? ""}`,
								)
								.join("\n\n")

							const system = `You are Corpus, a strictly source-grounded assistant.
Only answer using the supplied evidence chunks.
If evidence is insufficient, say that the selected sources do not support the answer.
For every substantive factual paragraph, cite chunk IDs using [[cite:CHUNK_ID]] markers.
Do not invent facts from general knowledge.
Never cite chunk IDs that were not supplied.`

							const userPrompt = `Evidence:\n${evidenceBlock || "(none)"}\n\nRecent exchanges:\n${historyText || "(none)"}\n\nQuestion:\n${prepared.prompt}`

							if (evidencePack.insufficient) {
								fullText =
									"The selected sources do not support an answer to that question."
								await finalize({
									content: fullText,
									status: "complete",
									citations: [],
								})
								streamController.enqueue(encodeSse("text", { delta: fullText }))
								streamController.enqueue(encodeSse("done", {}))
								streamController.close()
								return
							}

							await emitStatus(CHAT_PROGRESS.writing)

							const result = streamText({
								model: openai(MODELS.chat),
								system,
								prompt: userPrompt,
								abortSignal: controller.signal,
								experimental_transform: smoothStream({
									delayInMs: 20,
									chunking: "word",
								}),
							})

							for await (const part of result.stream) {
								if (part.type === "error") {
									throw part.error instanceof Error
										? part.error
										: new Error(formatChatError(part.error))
								}

								if (part.type !== "text-delta") {
									continue
								}

								const delta = part.text
								fullText += delta
								streamController.enqueue(encodeSse("text", { delta }))

								const now = Date.now()

								if (now - lastPersist > 400) {
									lastPersist = now
									await fetchAuthMutation(api.chat.appendAssistantText, {
										messageId: prepared.assistantMessageId as never,
										generationId: prepared.generationId,
										content: fullText,
									})
								}
							}

							if (!fullText.trim()) {
								throw new Error("The model returned an empty answer.")
							}

							let parsed = parseCitationMarkers(fullText)
							const allowed = new Set(
								evidencePack.evidence.map(
									(item: (typeof evidencePack.evidence)[number]) =>
										String(item.chunkId),
								),
							)
							let validation = validateCitations(parsed.citations, allowed)

							if (validation.invalid.length) {
								const retry = await generateText({
									model: openai(MODELS.chat),
									system: `${system}\nOnly cite these chunk IDs: ${[...allowed].join(", ")}`,
									prompt: userPrompt,
								})
								fullText = retry.text
								parsed = parseCitationMarkers(fullText)
								validation = validateCitations(parsed.citations, allowed)
							}

							if (validation.invalid.length) {
								await finalize({
									content: parsed.text || fullText,
									status: "failed",
									errorMessage: "Citation validation failed.",
								})
								streamController.enqueue(
									encodeSse("error", {
										message: "Citation validation failed.",
									}),
								)
								streamController.close()
								return
							}

							const citations = validation.valid.map((citation, order) => {
								const evidence = evidencePack.evidence.find(
									(item: (typeof evidencePack.evidence)[number]) =>
										String(item.chunkId) === citation.chunkId,
								)

								return {
									sourceId: evidence?.sourceId as never,
									chunkId: citation.chunkId as never,
									sourceTitleSnapshot: "Source",
									excerpt: evidence?.text.slice(0, 400) || "",
									locator:
										evidence &&
										typeof evidence.startOffset === "number" &&
										typeof evidence.endOffset === "number" &&
										typeof evidence.ordinal === "number"
											? {
													startOffset: evidence.startOffset,
													endOffset: evidence.endOffset,
													ordinal: evidence.ordinal,
												}
											: undefined,
									order,
								}
							})

							const titled = citations.map((citation) => ({
								...citation,
								sourceTitleSnapshot: citation.excerpt
									? citation.excerpt.slice(0, 48)
									: "Source",
							}))

							const content = remapCitationMarkers(
								parsed.text,
								parsed.citations,
								validation.valid,
							)

							await finalize({
								content,
								status: "complete",
								citations: titled,
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
			},
		},
	},
})
