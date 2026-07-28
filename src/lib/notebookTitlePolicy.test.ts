import { describe, expect, test } from "bun:test"
import {
  canApplyGeneratedTitle,
  isStaleTitleRefresh,
  patchForClearedNotebookTitle,
  shouldSkipTitleRefresh,
  sourceHasTitleEvidence,
} from "./notebookTitlePolicy"

describe("notebook title policy", () => {
  test("skips refresh only for manual titles", () => {
    expect(shouldSkipTitleRefresh("manual")).toBe(true)
    expect(shouldSkipTitleRefresh("placeholder")).toBe(false)
    expect(shouldSkipTitleRefresh("generated")).toBe(false)
  })

  test("allows overwrite for placeholder and generated titles", () => {
    expect(canApplyGeneratedTitle("placeholder")).toBe(true)
    expect(canApplyGeneratedTitle("generated")).toBe(true)
    expect(canApplyGeneratedTitle("manual")).toBe(false)
  })

  test("cleared title returns ownership to automatic naming", () => {
    expect(patchForClearedNotebookTitle()).toMatchInlineSnapshot(`
      {
        "title": "",
        "titleGenerationState": "pending",
        "titleOrigin": "placeholder",
      }
    `)
  })

  test("latest-wins skips starting a superseded refresh", () => {
    expect(isStaleTitleRefresh(3, 2)).toBe(true)
    expect(isStaleTitleRefresh(3, 3)).toBe(false)
    expect(isStaleTitleRefresh(undefined, 0)).toBe(false)
  })

  test("title evidence requires digest draft or ready markdown", () => {
    expect(
      sourceHasTitleEvidence({
        processingState: "embedding",
        digestStatus: "pending",
        digestText: "Draft digest.",
      }),
    ).toBe(true)

    expect(
      sourceHasTitleEvidence({
        processingState: "ready",
        normalizedStorageId: "storage:1",
      }),
    ).toBe(true)

    expect(
      sourceHasTitleEvidence({
        processingState: "embedding",
      }),
    ).toBe(false)

    expect(
      sourceHasTitleEvidence({
        deletedAt: 1,
        processingState: "ready",
        normalizedStorageId: "storage:1",
      }),
    ).toBe(false)

    expect(
      sourceHasTitleEvidence({
        processingState: "failed",
        digestStatus: "ready",
        digestText: "Ignored.",
      }),
    ).toBe(false)
  })
})
