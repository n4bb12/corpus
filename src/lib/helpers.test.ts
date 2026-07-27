import { describe, expect, test } from "bun:test"
import { formatChatError } from "./chatErrors"
import {
  applySourceBoundaryPlan,
  canRetryLatestAssistant,
  getOptimisticUserPrompt,
  hashSourceSelection,
  planSourceBoundary,
  planSourceBoundaryFromEntries,
  readySelectedSourceIds,
  shouldCreateSourceRevision,
  successfulPairsAfterBoundary,
} from "./chatHistory"
import {
  consumeChatSse,
  parseSseChunk,
  resolveStreamedAssistantContent,
} from "./chatSse"
import { deriveChunkLocators } from "./chunkLocators"
import { resolveCitationOffsets } from "./citationHighlight"
import {
  parseCitationMarkers,
  splitCitedParagraphs,
  validateCitations,
} from "./citations"
import { describeRejectedFile, isAcceptedUpload } from "./fileTypes"
import { markdownToPlainText } from "./markdownPlain"
import { cleanPdfText, isUsefulPdfText } from "./pdfText"
import { remainingQuota, utcDateKey } from "./quotas"
import {
  mergeRetrievalCandidates,
  selectEvidenceWithinBudget,
} from "./retrieval"
import {
  looksLikeFilename,
  normalizeTitle,
  titleFromFilename,
  titleFromMarkdown,
  titleFromPastedText,
  titleFromUrl,
} from "./sourceTitle"
import {
  markUploadingSourceCreated,
  removeUploadingSource,
  visibleUploadingSources,
} from "./uploadingSources"
import { isBlockedResolvedAddress, validatePublicHttpUrl } from "./urlSafety"

describe("source titles", () => {
  test("normalizes and truncates", () => {
    expect(
      normalizeTitle("  Hello   world  ", "Fallback"),
    ).toMatchInlineSnapshot(`"Hello world"`)
    expect(normalizeTitle("a".repeat(120), "Fallback").length).toBe(100)
    expect(normalizeTitle("   ", "Fallback")).toMatchInlineSnapshot(
      `"Fallback"`,
    )
  })

  test("decodes html entities", () => {
    expect(
      normalizeTitle("Mission &#8211; Biblebots", "Fallback"),
    ).toMatchInlineSnapshot(`"Mission – Biblebots"`)
    expect(
      normalizeTitle("A &amp; B &ndash; C", "Fallback"),
    ).toMatchInlineSnapshot(`"A & B – C"`)
  })

  test("builds fallbacks", () => {
    expect(titleFromPastedText("Line one\nLine two")).toMatchInlineSnapshot(
      `"Line one"`,
    )
    expect(
      titleFromUrl("https://example.com/docs/guide"),
    ).toMatchInlineSnapshot(`"example.com/docs/guide"`)
    expect(titleFromFilename("notes.pdf")).toMatchInlineSnapshot(`"notes.pdf"`)
    expect(
      titleFromMarkdown(
        "## Elternbrief\n\nElternbrief zum Start des Infoportals mit wichtigen Hinweisen. Mehr Text folgt.",
      ),
    ).toMatchInlineSnapshot(
      `"Elternbrief zum Start des Infoportals mit wichtigen Hinweisen."`,
    )
    expect(looksLikeFilename("Elternbrief_Start_Infoportal.pdf")).toBe(true)
    expect(looksLikeFilename("Infoportal start letter")).toBe(false)
  })
})

describe("url safety", () => {
  test("accepts public https urls", () => {
    expect(validatePublicHttpUrl("https://example.com/a").ok).toBe(true)
  })

  test("rejects credentials and private hosts", () => {
    expect(validatePublicHttpUrl("https://user:pass@example.com").ok).toBe(
      false,
    )
    expect(validatePublicHttpUrl("http://127.0.0.1/secret").ok).toBe(false)
    expect(validatePublicHttpUrl("http://169.254.169.254/latest").ok).toBe(
      false,
    )
    expect(isBlockedResolvedAddress("10.0.0.8")).toBe(true)
  })
})

describe("file types", () => {
  test("accepts supported uploads", () => {
    expect(isAcceptedUpload("paper.pdf", "application/pdf")).toBe(true)
    expect(isAcceptedUpload("notes.md", "text/markdown")).toBe(true)
    expect(isAcceptedUpload("slide.pptx")).toBe(false)
    expect(describeRejectedFile("photo.png")).toContain("unsupported")
  })
})

describe("uploading sources", () => {
  test("keeps placeholders until the created source appears", () => {
    const uploading = [
      {
        localId: "a",
        filename: "a.pdf",
        title: "a.pdf",
      },
      {
        localId: "b",
        filename: "b.pdf",
        title: "b.pdf",
        sourceId: "sources_b" as never,
      },
    ]

    expect(
      visibleUploadingSources(uploading, ["sources_b" as never]).map(
        (entry) => entry.localId,
      ),
    ).toMatchInlineSnapshot(`
			[
			  "a",
			]
		`)
    expect(
      markUploadingSourceCreated(uploading, "a", "sources_a" as never),
    ).toMatchInlineSnapshot(`
			[
			  {
			    "filename": "a.pdf",
			    "localId": "a",
			    "sourceId": "sources_a",
			    "title": "a.pdf",
			  },
			  {
			    "filename": "b.pdf",
			    "localId": "b",
			    "sourceId": "sources_b",
			    "title": "b.pdf",
			  },
			]
		`)
    expect(
      removeUploadingSource(uploading, "a").map((entry) => entry.localId),
    ).toMatchInlineSnapshot(`
			[
			  "b",
			]
		`)
  })
})

describe("chunk locators", () => {
  test("derives offsets", () => {
    const text = "alpha beta gamma"
    expect(
      deriveChunkLocators(["alpha", "gamma"], text),
    ).toMatchInlineSnapshot(`
      [
        {
          "endOffset": 5,
          "ordinal": 0,
          "startOffset": 0,
        },
        {
          "endOffset": 16,
          "ordinal": 1,
          "startOffset": 11,
        },
      ]
    `)
  })
})

describe("retrieval helpers", () => {
  test("merges and budgets evidence", () => {
    const merged = mergeRetrievalCandidates(
      [
        {
          chunkId: "a",
          sourceId: "s1",
          text: "one",
          score: 0.9,
          startOffset: 0,
          endOffset: 3,
          ordinal: 0,
        },
        {
          chunkId: "b",
          sourceId: "s1",
          text: "two",
          score: 0.4,
          startOffset: 4,
          endOffset: 7,
          ordinal: 1,
        },
      ],
      [
        {
          chunkId: "a",
          sourceId: "s1",
          text: "one",
          score: 0.5,
          startOffset: 0,
          endOffset: 3,
          ordinal: 0,
        },
      ],
    )

    expect(merged[0]?.channel).toMatchInlineSnapshot(`"both"`)
    expect(
      selectEvidenceWithinBudget(
        [
          {
            chunkId: "a",
            sourceId: "s1",
            text: "12345",
            score: 1,
            channel: "vector",
            startOffset: 0,
            endOffset: 5,
            ordinal: 0,
          },
          {
            chunkId: "b",
            sourceId: "s1",
            text: "67890",
            score: 0.5,
            channel: "text",
            startOffset: 5,
            endOffset: 10,
            ordinal: 1,
          },
        ],
        8,
      ).map((item) => item.chunkId),
    ).toMatchInlineSnapshot(`
      [
        "a",
      ]
    `)
  })
})

describe("citations", () => {
  test("parses and validates markers", () => {
    const parsed = parseCitationMarkers("Hello [[cite:c1,c2]] world")
    expect(parsed.text).toMatchInlineSnapshot(
      `"Hello [[cite:1]] [[cite:2]] world"`,
    )
    expect(
      validateCitations(parsed.citations, new Set(["c1"])).valid,
    ).toMatchInlineSnapshot(`
      [
        {
          "chunkId": "c1",
        },
      ]
    `)
  })

  test("splits numbered markers onto paragraphs", () => {
    expect(
      splitCitedParagraphs(
        "First claim. [[cite:1]]\n\nSecond claim. [[cite:2]] [[cite:1]]",
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "citationIndexes": [
            1,
          ],
          "text": "First claim.",
        },
        {
          "citationIndexes": [
            2,
            1,
          ],
          "text": "Second claim.",
        },
      ]
    `)
  })

  test("resolves citation offsets from locator or excerpt fallback", () => {
    const markdown = "Intro line\n\nExact passage about pine trees.\n\nOutro"

    expect(
      resolveCitationOffsets(markdown, { start: 12, end: 44 }),
    ).toMatchInlineSnapshot(`
      {
        "end": 44,
        "start": 12,
      }
    `)

    expect(
      resolveCitationOffsets(markdown, { start: 999, end: 1200 }, "pine trees"),
    ).toMatchInlineSnapshot(`
      {
        "end": 42,
        "start": 32,
      }
    `)

    expect(
      resolveCitationOffsets(markdown, null, "missing excerpt"),
    ).toMatchInlineSnapshot(`null`)
  })
})

describe("markdown plain text", () => {
  test("strips common markdown for citation excerpts", () => {
    expect(
      markdownToPlainText(
        "## Heading\n\nA **bold** claim with a [link](https://example.com) and `code`.",
      ),
    ).toMatchInlineSnapshot(`"Heading A bold claim with a link and code."`)
  })
})

describe("pdf text helpers", () => {
  test("rejects page-marker-only extraction", () => {
    expect(cleanPdfText("\n\n-- 1 of 1 --\n\n")).toMatchInlineSnapshot(`""`)
    expect(isUsefulPdfText("\n\n-- 1 of 1 --\n\n")).toBe(false)
    expect(
      isUsefulPdfText(
        "Elternbrief zum Start des Infoportals mit wichtigen Hinweisen.",
      ),
    ).toBe(true)
  })
})

describe("chat history", () => {
  test("shows a submitted prompt until server messages arrive", () => {
    const submission = {
      content: "What are the main claims?",
      existingMessageCount: 0,
    }

    expect(getOptimisticUserPrompt([], submission)).toMatchInlineSnapshot(
      `"What are the main claims?"`,
    )
    expect(
      getOptimisticUserPrompt(
        [
          {
            kind: "message",
            role: "user",
            content: submission.content,
            createdAt: 1,
          },
        ],
        submission,
      ),
    ).toMatchInlineSnapshot(`null`)
  })

  test("windows successful pairs and retry eligibility", () => {
    const entries = [
      {
        kind: "sourceBoundary" as const,
        createdAt: 1,
      },
      {
        kind: "message" as const,
        role: "user" as const,
        exchangeId: "e1",
        status: "complete" as const,
        createdAt: 2,
      },
      {
        kind: "message" as const,
        role: "assistant" as const,
        exchangeId: "e1",
        status: "complete" as const,
        createdAt: 3,
      },
      {
        kind: "message" as const,
        role: "user" as const,
        exchangeId: "e2",
        status: "complete" as const,
        createdAt: 4,
      },
      {
        kind: "message" as const,
        role: "assistant" as const,
        exchangeId: "e2",
        status: "failed" as const,
        createdAt: 5,
      },
    ]

    expect(successfulPairsAfterBoundary(entries, 10)).toHaveLength(1)
    expect(canRetryLatestAssistant(entries)).toBe(true)
    expect(
      canRetryLatestAssistant([
        {
          kind: "message",
          role: "user",
          exchangeId: "e3",
          status: "complete",
          content: "hi",
          createdAt: 1,
        },
        {
          kind: "message",
          role: "assistant",
          exchangeId: "e3",
          status: "complete",
          content: "",
          createdAt: 2,
        },
      ]),
    ).toBe(true)
    expect(shouldCreateSourceRevision(["a"], ["a", "b"])).toBe(true)
    expect(shouldCreateSourceRevision(["b", "a"], ["a", "b"])).toBe(false)
    expect(
      planSourceBoundary({
        previousIds: ["a"],
        nextIds: ["b"],
        chatSelectionHash: hashSourceSelection(["a"]),
        hasSuccessfulExchange: true,
        activeStreaming: false,
        trailingKind: "message",
      }),
    ).toMatchInlineSnapshot(`
      {
        "activeSourceCount": 1,
        "selectionHash": "b",
        "type": "insert",
      }
    `)
    expect(
      planSourceBoundary({
        previousIds: ["b"],
        nextIds: ["a"],
        chatSelectionHash: hashSourceSelection(["a"]),
        hasSuccessfulExchange: true,
        activeStreaming: false,
        trailingKind: "sourceBoundary",
      }),
    ).toMatchInlineSnapshot(`
      {
        "selectionHash": "a",
        "type": "remove",
      }
    `)

    const boundaryEntries: Array<{
      _id: string
      kind: "message" | "sourceBoundary"
      role?: "user" | "assistant"
      status?: "pending" | "streaming" | "complete" | "failed" | "canceled"
      selectionHash?: string
      activeSourceCount?: number
      createdAt: number
    }> = [
      {
        _id: "m1",
        kind: "message",
        role: "assistant",
        status: "complete",
        createdAt: 1,
      },
    ]
    const insertPlan = planSourceBoundaryFromEntries(boundaryEntries, {
      previousIds: ["a"],
      nextIds: ["b"],
      chatSelectionHash: hashSourceSelection(["a"]),
    })
    expect(insertPlan).toMatchInlineSnapshot(`
			{
			  "activeSourceCount": 1,
			  "selectionHash": "b",
			  "type": "insert",
			}
		`)
    expect(
      readySelectedSourceIds([
        {
          _id: "a",
          selected: true,
          processingState: "ready",
        },
        {
          _id: "b",
          selected: true,
          processingState: "pending",
        },
        {
          _id: "c",
          selected: false,
          processingState: "ready",
        },
      ]),
    ).toMatchInlineSnapshot(`
			[
			  "a",
			]
		`)
    expect(
      applySourceBoundaryPlan(boundaryEntries, insertPlan, (plan) => ({
        _id: "boundary",
        kind: "sourceBoundary" as const,
        selectionHash: plan.selectionHash,
        activeSourceCount: plan.activeSourceCount,
        createdAt: 2,
      })).map((entry) => entry.kind),
    ).toMatchInlineSnapshot(`
			[
			  "message",
			  "sourceBoundary",
			]
		`)
  })
})

describe("chat errors", () => {
  test("maps provider failures to readable copy", () => {
    expect(
      formatChatError("openai insufficient_quota billing"),
    ).toMatchInlineSnapshot(
      `"Chat is temporarily unavailable. Try again later."`,
    )
    expect(
      formatChatError(new Error("rate_limit exceeded")),
    ).toMatchInlineSnapshot(
      `"Too many requests right now. Try again in a moment."`,
    )
    expect(formatChatError("boom")).toMatchInlineSnapshot(`"boom"`)
  })
})

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

describe("quotas", () => {
  test("computes remaining usage", () => {
    expect(remainingQuota(3, 10)).toMatchInlineSnapshot(`7`)
    expect(
      utcDateKey(new Date("2026-07-25T12:00:00.000Z")),
    ).toMatchInlineSnapshot(`"2026-07-25"`)
  })
})
