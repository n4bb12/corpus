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
    const response = new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder()

          controller.enqueue(
            encoder.encode(
              'event: citations\ndata: {"citations":[{"_id":"chunk-1","chunkId":"chunk-1","liveTitle":"Research notes","excerpt":"Evidence","canNavigate":true}]}\n\n',
            ),
          )
          controller.enqueue(
            encoder.encode('event: text\ndata: {"delta":"Hello"}\n\n'),
          )
          controller.enqueue(
            encoder.encode('event: text\ndata: {"delta":" world"}\n\n'),
          )
          controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"))
          controller.close()
        },
      }),
    )

    const result = await consumeChatSse(response, {
      onText: (text) => updates.push(text),
      onCitations: (citations) => {
        citationTitles.push(...citations.map((citation) => citation.liveTitle))
      },
    })

    expect(citationTitles).toMatchInlineSnapshot(`
      [
        "Research notes",
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
        "done": true,
        "error": null,
        "text": "Hello world",
      }
    `)
  })
})
