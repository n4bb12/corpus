import { describe, expect, test } from "bun:test"
import {
	canRetryLatestAssistant,
	shouldCreateSourceRevision,
	successfulPairsAfterBoundary,
} from "./chat-history"
import { deriveChunkLocators } from "./chunk-locators"
import { parseCitationMarkers, validateCitations } from "./citations"
import { describeRejectedFile, isAcceptedUpload } from "./file-types"
import { remainingQuota, utcDateKey } from "./quotas"
import {
	mergeRetrievalCandidates,
	selectEvidenceWithinBudget,
} from "./retrieval"
import {
	normalizeTitle,
	titleFromFilename,
	titleFromPastedText,
	titleFromUrl,
} from "./source-title"
import {
	isBlockedResolvedAddress,
	validatePublicHttpUrl,
} from "./url-safety"

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

	test("builds fallbacks", () => {
		expect(titleFromPastedText("Line one\nLine two")).toMatchInlineSnapshot(
			`"Line one"`,
		)
		expect(
			titleFromUrl("https://example.com/docs/guide"),
		).toMatchInlineSnapshot(`"example.com/docs/guide"`)
		expect(titleFromFilename("notes.pdf")).toMatchInlineSnapshot(`"notes.pdf"`)
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
				{ chunkId: "a", sourceId: "s1", text: "one", score: 0.9 },
				{ chunkId: "b", sourceId: "s1", text: "two", score: 0.4 },
			],
			[{ chunkId: "a", sourceId: "s1", text: "one", score: 0.5 }],
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
					},
					{
						chunkId: "b",
						sourceId: "s1",
						text: "67890",
						score: 0.5,
						channel: "text",
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
		expect(parsed.text).toMatchInlineSnapshot(`"Hello  world"`)
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
})

describe("chat history", () => {
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
		expect(shouldCreateSourceRevision(["a"], ["a", "b"])).toBe(true)
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
