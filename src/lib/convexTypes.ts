import type { Doc, Id } from "src/convex/_generated/dataModel"

export type NotebookListItem = Doc<"notebooks"> & {
  sourceCount: number
}

export type SourceDoc = Doc<"sources">

export type ChatEntryView = Doc<"chatEntries"> & {
  citations: Array<
    Doc<"citations"> & {
      liveTitle: string
      canNavigate: boolean
    }
  >
}

export type NotebookId = Id<"notebooks">
export type SourceId = Id<"sources">
