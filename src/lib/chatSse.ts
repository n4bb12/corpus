import {
  normalizeNumberedCitedMarkdown,
  parseCitationMarkers,
  remapCitationMarkers,
  usesNumberedCitationMarkers,
  validateCitations,
} from "src/lib/citations"

export type ChatSseResult = {
  done: boolean
  error: string | null
  text: string
  insufficient: boolean | null
  canceled: boolean
}

export type StreamCitation = {
  _id: string
  chunkId: string
  sourceId?: string
  liveTitle: string
  excerpt: string
  canNavigate: boolean
  locator?: { startOffset?: number; endOffset?: number } | null
}

export type ChatSseHandlers = {
  onText?: (text: string) => void
  onCitations?: (citations: StreamCitation[]) => void
  onInsufficient?: (insufficient: boolean) => void
  onStatus?: (label: string) => void
  /** When false, stop applying events even if the socket still delivers them. */
  shouldAccept?: () => boolean
  signal?: AbortSignal
}

function isStreamCitation(value: unknown): value is StreamCitation {
  return (
    !!value &&
    typeof value === "object" &&
    "_id" in value &&
    typeof value._id === "string" &&
    "chunkId" in value &&
    typeof value.chunkId === "string" &&
    "liveTitle" in value &&
    typeof value.liveTitle === "string" &&
    "excerpt" in value &&
    typeof value.excerpt === "string" &&
    "canNavigate" in value &&
    typeof value.canNavigate === "boolean"
  )
}

/** Parse mid-stream cites against the catalog; remap to validated numbered markers. */
export function resolveStreamedAssistantContent(
  text: string,
  catalog: StreamCitation[],
) {
  if (usesNumberedCitationMarkers(text)) {
    return {
      content: normalizeNumberedCitedMarkdown(text),
      citations: catalog,
    }
  }

  const parsed = parseCitationMarkers(text)
  const byChunkId = new Map(
    catalog.map((citation) => [citation.chunkId, citation]),
  )
  const validation = validateCitations(
    parsed.citations,
    new Set(byChunkId.keys()),
  )
  const citations = validation.valid.flatMap((reference) => {
    const citation = byChunkId.get(reference.chunkId)

    return citation ? [citation] : []
  })

  return {
    content: remapCitationMarkers(
      parsed.text,
      parsed.citations,
      validation.valid,
    ),
    citations,
  }
}

/** Drain complete SSE frames from `buffer`; return the unparsed remainder. */
export function parseSseChunk(
  buffer: string,
  onEvent: (event: string, data: unknown) => void,
) {
  const parts = buffer.split("\n\n")
  const rest = parts.pop() ?? ""

  for (const part of parts) {
    let event = "message"
    const dataLines: string[] = []

    for (const line of part.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim()
        continue
      }

      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim())
      }
    }

    if (!dataLines.length) {
      continue
    }

    const raw = dataLines.join("\n")

    try {
      onEvent(event, JSON.parse(raw))
    } catch {
      onEvent(event, raw)
    }
  }

  return rest
}

/** Read a chat SSE body; accumulate text and forward citation/status events. */
export async function consumeChatSse(
  response: Response,
  handlers: ChatSseHandlers = {},
): Promise<ChatSseResult> {
  const reader = response.body?.getReader()

  if (!reader) {
    return {
      done: false,
      error: "No answer came back. Try again.",
      text: "",
      insufficient: null,
      canceled: false,
    }
  }

  const decoder = new TextDecoder()
  let buffer = ""
  let done = false
  let error: string | null = null
  let text = ""
  let insufficient: boolean | null = null
  let canceled = false

  const accepting = () =>
    !canceled &&
    !handlers.signal?.aborted &&
    (handlers.shouldAccept?.() ?? true)

  const onAbort = () => {
    canceled = true
    void reader.cancel().catch(() => undefined)
  }

  handlers.signal?.addEventListener("abort", onAbort, { once: true })

  if (handlers.signal?.aborted) {
    onAbort()
  }

  try {
    while (accepting()) {
      let streamDone: boolean
      let value: Uint8Array | undefined

      try {
        ;({ done: streamDone, value } = await reader.read())
      } catch (err) {
        if (
          handlers.signal?.aborted ||
          (err as Error).name === "AbortError" ||
          canceled
        ) {
          canceled = true
          break
        }

        throw err
      }

      if (streamDone) {
        break
      }

      if (!accepting() || !value) {
        break
      }

      buffer = parseSseChunk(
        buffer + decoder.decode(value, { stream: true }),
        (event, data) => {
          if (!accepting()) {
            return
          }

          if (event === "done") {
            done = true
            return
          }

          if (event === "error") {
            const message =
              data &&
              typeof data === "object" &&
              "message" in data &&
              typeof data.message === "string"
                ? data.message
                : "Couldn't generate an answer."
            error = message
            return
          }

          if (
            event === "insufficient" &&
            data &&
            typeof data === "object" &&
            "insufficient" in data &&
            typeof data.insufficient === "boolean"
          ) {
            insufficient = data.insufficient
            handlers.onInsufficient?.(data.insufficient)
            return
          }

          if (
            event === "status" &&
            data &&
            typeof data === "object" &&
            "label" in data &&
            typeof data.label === "string"
          ) {
            handlers.onStatus?.(data.label)
            return
          }

          if (
            event === "citations" &&
            data &&
            typeof data === "object" &&
            "citations" in data &&
            Array.isArray(data.citations)
          ) {
            handlers.onCitations?.(data.citations.filter(isStreamCitation))
            return
          }

          if (event === "text" && data && typeof data === "object") {
            if ("text" in data && typeof data.text === "string") {
              text = data.text
              handlers.onText?.(text)
              return
            }

            if ("delta" in data && typeof data.delta === "string") {
              text += data.delta
              handlers.onText?.(text)
            }
          }
        },
      )
    }
  } finally {
    handlers.signal?.removeEventListener("abort", onAbort)

    if (canceled || handlers.signal?.aborted) {
      canceled = true
      await reader.cancel().catch(() => undefined)
    }
  }

  return { done, error, text, insufficient, canceled }
}
