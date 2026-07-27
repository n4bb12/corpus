import { describe, expect, test } from "bun:test"
import {
  markUploadingSourceCreated,
  removeUploadingSource,
  visibleUploadingSources,
} from "./uploadingSources"

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
