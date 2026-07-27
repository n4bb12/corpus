import { describe, expect, test } from "bun:test"
import {
  consumeChatSse,
  parseSseChunk,
  resolveStreamedAssistantContent,
} from "./chatSse"

describe("chat sse", () => {
  test("resolves citations as their paragraph markers stream in", () => {
    const catalog = [
      {
        _id: "chunk-1",
        chunkId: "chunk-1",
        sourceId: "source-1",
        liveTitle: "Research notes",
        excerpt: "Supporting evidence",
        canNavigate: true,
      },
    ]

    expect(
      resolveStreamedAssistantContent(
        "First supported paragraph. [[cite:chunk-1]]\n\nStill writing",
        catalog,
      ),
    ).toMatchInlineSnapshot(`
      {
        "citations": [
          {
            "_id": "chunk-1",
            "canNavigate": true,
            "chunkId": "chunk-1",
            "excerpt": "Supporting evidence",
            "liveTitle": "Research notes",
            "sourceId": "source-1",
          },
        ],
        "content": 
      "First supported paragraph. [[cite:1]]

      Still writing"
      ,
      }
      `)
  })

  test("parses framed status and error events", () => {
    const events: Array<{ event: string; data: unknown }> = []
    const rest = parseSseChunk(
      'event: status\ndata: {"label":"Writing an answer…"}\n\nevent: error\ndata: {"message":"nope"}\n\npartial',
      (event, data) => {
        events.push({ event, data })
      },
    )

    expect(rest).toMatchInlineSnapshot(`"partial"`)
    expect(events).toMatchInlineSnapshot(`
      [
        {
          "data": {
            "label": "Writing an answer…",
          },
          "event": "status",
        },
        {
          "data": {
            "message": "nope",
          },
          "event": "error",
        },
      ]
    `)
  })

  test("reports each accumulated text update while consuming", async () => {
    const updates: string[] = []
    const citationTitles: string[] = []
    const insufficientFlags: boolean[] = []
    const statusLabels: string[] = []
    const response = new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder()

          controller.enqueue(
            encoder.encode(
              'event: status\ndata: {"label":"Looking through your sources…"}\n\n',
            ),
          )
          controller.enqueue(
            encoder.encode(
              'event: citations\ndata: {"citations":[{"_id":"chunk-1","chunkId":"chunk-1","liveTitle":"Research notes","excerpt":"Evidence","canNavigate":true}]}\n\n',
            ),
          )
          controller.enqueue(
            encoder.encode(
              'event: insufficient\ndata: {"insufficient":false}\n\n',
            ),
          )
          controller.enqueue(
            encoder.encode('event: text\ndata: {"delta":"Hello"}\n\n'),
          )
          controller.enqueue(
            encoder.encode('event: text\ndata: {"text":"Hello world"}\n\n'),
          )
          controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"))
          controller.close()
        },
      }),
    )

    const result = await consumeChatSse(response, {
      onText: (text) => updates.push(text),
      onStatus: (label) => statusLabels.push(label),
      onCitations: (citations) => {
        citationTitles.push(...citations.map((citation) => citation.liveTitle))
      },
      onInsufficient: (insufficient) => {
        insufficientFlags.push(insufficient)
      },
    })

    expect(statusLabels).toMatchInlineSnapshot(`
      [
        "Looking through your sources…",
      ]
    `)
    expect(citationTitles).toMatchInlineSnapshot(`
      [
        "Research notes",
      ]
    `)
    expect(insufficientFlags).toMatchInlineSnapshot(`
      [
        false,
      ]
    `)
    expect(updates).toMatchInlineSnapshot(`
      [
        "Hello",
        "Hello world",
      ]
    `)
    expect(result).toMatchInlineSnapshot(`
      {
        "canceled": false,
        "done": true,
        "error": null,
        "insufficient": false,
        "text": "Hello world",
      }
    `)
  })

  test("stops accepting chunks after shouldAccept turns false", async () => {
    const updates: string[] = []
    let accept = true
    const response = new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder()

          controller.enqueue(
            encoder.encode('event: text\ndata: {"text":"partial"}\n\n'),
          )
          controller.enqueue(
            encoder.encode('event: text\ndata: {"text":"ignored"}\n\n'),
          )
          controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"))
          controller.close()
        },
      }),
    )

    const result = await consumeChatSse(response, {
      shouldAccept: () => accept,
      onText: (text) => {
        updates.push(text)
        accept = false
      },
    })

    expect(updates).toMatchInlineSnapshot(`
      [
        "partial",
      ]
    `)
    expect(result).toMatchInlineSnapshot(`
      {
        "canceled": false,
        "done": false,
        "error": null,
        "insufficient": null,
        "text": "partial",
      }
    `)
  })

  test("cancels the reader when the abort signal fires", async () => {
    const updates: string[] = []
    const abort = new AbortController()
    let cancelCalled = false
    const response = new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder()

          controller.enqueue(
            encoder.encode('event: text\ndata: {"text":"before"}\n\n'),
          )
        },
        cancel() {
          cancelCalled = true
        },
      }),
    )

    const pending = consumeChatSse(response, {
      signal: abort.signal,
      onText: (text) => {
        updates.push(text)
        abort.abort()
      },
    })

    const result = await pending

    expect(updates).toMatchInlineSnapshot(`
      [
        "before",
      ]
    `)
    expect(cancelCalled).toBe(true)
    expect(result).toMatchInlineSnapshot(`
      {
        "canceled": true,
        "done": false,
        "error": null,
        "insufficient": null,
        "text": "before",
      }
    `)
  })
})
