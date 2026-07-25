import { describe, expect, test } from "vitest"
import schema from "../../convex/schema"

describe("schema smoke", () => {
	test("defines core tables", () => {
		expect(Object.keys(schema.tables).sort()).toMatchInlineSnapshot(`
      [
        "chatEntries",
        "chunks",
        "citations",
        "dailyUsage",
        "emailEvents",
        "notebooks",
        "sources",
      ]
    `)
	})
})
