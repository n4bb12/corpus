import { describe, expect, test } from "bun:test"
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
