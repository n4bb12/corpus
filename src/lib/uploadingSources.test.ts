import { describe, expect, test } from "bun:test"
import {
  addedAtForBatch,
  markUploadingSourceCreated,
  mergeSourcesListEntries,
  removeUploadingSource,
  rowKeysForUploadingSources,
  visibleUploadingSources,
} from "./uploadingSources"

describe("uploading sources", () => {
  test("keeps placeholders until the created source appears", () => {
    const uploading = [
      {
        localId: "a",
        filename: "a.pdf",
        title: "a.pdf",
        addedAt: 3,
      },
      {
        localId: "b",
        filename: "b.pdf",
        title: "b.pdf",
        addedAt: 2,
        sourceId: "sources_b" as never,
      },
    ]

    expect(
      visibleUploadingSources(uploading, [
        {
          _id: "sources_b" as never,
          createdAt: 2,
          title: "b.pdf",
        },
      ]).map((entry) => entry.localId),
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
			    "addedAt": 3,
			    "filename": "a.pdf",
			    "localId": "a",
			    "sourceId": "sources_a",
			    "title": "a.pdf",
			  },
			  {
			    "addedAt": 2,
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

  test("hides placeholder when Convex publishes before sourceId is stamped", () => {
    const uploading = [
      {
        localId: "local-a",
        filename: "a.pdf",
        title: "a.pdf",
        addedAt: 1003,
      },
    ]
    const sources = [
      {
        _id: "sources_a" as never,
        createdAt: 1003,
        title: "a.pdf",
      },
    ]

    expect(
      visibleUploadingSources(uploading, sources).map((entry) => entry.localId),
    ).toMatchInlineSnapshot(`[]`)
    expect(
      rowKeysForUploadingSources(uploading, sources),
    ).toMatchInlineSnapshot(`
			{
			  "sources_a": "local-a",
			}
		`)
    expect(
      mergeSourcesListEntries(
        visibleUploadingSources(uploading, sources),
        sources as never,
        rowKeysForUploadingSources(uploading, sources),
      ).map((entry) => ({
        type: entry.type,
        key: entry.key,
        title: entry.source.title,
      })),
    ).toMatchInlineSnapshot(`
			[
			  {
			    "key": "local-a",
			    "title": "a.pdf",
			    "type": "source",
			  },
			]
		`)
  })

  test("batch addedAt keeps earlier files above later ones when sorted newest-first", () => {
    const now = 1_000
    const stamps = [0, 1, 2].map((index) => addedAtForBatch(index, 3, now))

    expect(stamps).toMatchInlineSnapshot(`
			[
			  1003,
			  1002,
			  1001,
			]
		`)
  })

  test("merged list keeps add order as uploads complete out of order", () => {
    const uploading = [
      {
        localId: "b",
        filename: "b.pdf",
        title: "b.pdf",
        addedAt: 2,
      },
      {
        localId: "c",
        filename: "c.pdf",
        title: "c.pdf",
        addedAt: 1,
      },
    ]
    const sources = [
      {
        _id: "sources_a" as never,
        title: "a.pdf",
        createdAt: 3,
      },
    ]

    expect(
      mergeSourcesListEntries(uploading, sources as never).map(
        (entry) => entry.key,
      ),
    ).toMatchInlineSnapshot(`
			[
			  "sources_a",
			  "b",
			  "c",
			]
		`)
  })

  test("merged list reuses upload localId as the source row key after handoff", () => {
    const sources = [
      {
        _id: "sources_b" as never,
        title: "b.pdf",
        createdAt: 2,
      },
    ]

    expect(
      mergeSourcesListEntries([], sources as never, {
        sources_b: "local-b",
      }).map((entry) => ({ type: entry.type, key: entry.key })),
    ).toMatchInlineSnapshot(`
			[
			  {
			    "key": "local-b",
			    "type": "source",
			  },
			]
		`)
  })
})
