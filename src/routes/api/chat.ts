import { createOpenAI } from "@ai-sdk/openai"
import { createFileRoute } from "@tanstack/react-router"
import { generateText, streamText } from "ai"
import { api } from "src/convex/_generated/api"
import {
	parseCitationMarkers,
	validateCitations,
} from "src/convex/lib/citations"
import {
	fetchAuthAction,
	fetchAuthMutation,
	getToken,
} from "src/lib/auth-server"
import { MODELS } from "src/lib/limits"

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
							error:
								error instanceof Error
									? error.message
									: "Could not start chat.",
						},
						{ status: 400 },
					)
				}

				const evidencePack = (await fetchAuthAction(
					api.retrieval.prepareEvidence,
					{
						notebookId: body.notebookId as never,
						prompt: prepared.prompt,
						sourceIds: prepared.sourceIds as never,
					},
				)) as {
					evidence: Array<{
						chunkId: string
						sourceId: string
						text: string
						score: number
					}>
					insufficient: boolean
				}

				const openai = createOpenAI({
					apiKey: process.env.OPENAI_API_KEY,
				})

				const evidenceBlock = evidencePack.evidence
					.map(
						(item: (typeof evidencePack.evidence)[number], index: number) =>
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

				const encoder = new TextEncoder()
				let fullText = ""
				let lastPersist = 0
				const controller = new AbortController()

				request.signal.addEventListener("abort", () => {
					controller.abort()
				})

				const stream = new ReadableStream({
					async start(streamController) {
						try {
							if (evidencePack.insufficient) {
								fullText =
									"The selected sources do not support an answer to that question."
								await fetchAuthMutation(api.chat.finalizeAssistant, {
									messageId: prepared.assistantMessageId as never,
									generationId: prepared.generationId,
									content: fullText,
									status: "complete",
									citations: [],
								})
								streamController.enqueue(encoder.encode(fullText))
								streamController.close()
								return
							}

							const result = streamText({
								model: openai(MODELS.chat),
								system,
								prompt: userPrompt,
								abortSignal: controller.signal,
							})

							for await (const delta of result.textStream) {
								fullText += delta
								streamController.enqueue(encoder.encode(delta))

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
								await fetchAuthMutation(api.chat.finalizeAssistant, {
									messageId: prepared.assistantMessageId as never,
									generationId: prepared.generationId,
									content: parsed.text || fullText,
									status: "failed",
									errorMessage: "Citation validation failed.",
								})
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
									order,
								}
							})

							// Enrich titles from selected sources when possible
							const titled = citations.map((citation) => ({
								...citation,
								sourceTitleSnapshot: citation.excerpt
									? citation.excerpt.slice(0, 48)
									: "Source",
							}))

							await fetchAuthMutation(api.chat.finalizeAssistant, {
								messageId: prepared.assistantMessageId as never,
								generationId: prepared.generationId,
								content: parsed.text,
								status: "complete",
								citations: titled,
							})

							streamController.close()
						} catch (error) {
							const canceled = controller.signal.aborted
							await fetchAuthMutation(api.chat.finalizeAssistant, {
								messageId: prepared.assistantMessageId as never,
								generationId: prepared.generationId,
								content: fullText,
								status: canceled ? "canceled" : "failed",
								errorMessage:
									error instanceof Error ? error.message : "Generation failed.",
							})
							streamController.close()
						}
					},
				})

				return new Response(stream, {
					headers: {
						"Content-Type": "text/plain; charset=utf-8",
						"Cache-Control": "no-cache",
					},
				})
			},
		},
	},
})
