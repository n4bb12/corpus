import { describe, expect, test } from "bun:test"
import schema from "./schema"

describe("schema smoke", () => {
	test("defines core tables", () => {
		expect(Object.keys(schema.tables).sort()).toMatchInlineSnapshot(`
      [
        "chatEntries",
        "chunks",
        "citations",
        "dailyUsage",
        "notebooks",
        "sources",
      ]
    `)
	})
})
