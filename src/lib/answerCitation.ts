/**
 * Shared Answer Citation slot — stream catalog, persisted list enrichment,
 * and Citation pills all use this shape.
 */
export type AnswerCitationSlot = {
  _id: string
  chunkId: string
  sourceId?: string
  liveTitle: string
  excerpt: string
  canNavigate: boolean
  locator?: {
    startOffset?: number
    endOffset?: number
    ordinal?: number
  } | null
}

export function answerCitationSlotId(order: number) {
  return `answer-cite-${order}`
}

export function toAnswerCitationSlots(
  citations: Array<{
    chunkId: string
    sourceId?: string
    sourceTitleSnapshot: string
    excerpt: string
    locator?: {
      startOffset: number
      endOffset: number
      ordinal: number
    }
    order: number
  }>,
  sourcesById: Map<string, { deletedAt?: number | null } | null | undefined>,
): AnswerCitationSlot[] {
  return citations.map((citation) => {
    const source = citation.sourceId ? sourcesById.get(citation.sourceId) : null

    return {
      _id: answerCitationSlotId(citation.order),
      chunkId: String(citation.chunkId),
      sourceId: citation.sourceId,
      liveTitle: citation.sourceTitleSnapshot,
      excerpt: citation.excerpt,
      canNavigate: Boolean(source && !source.deletedAt),
      locator: citation.locator,
    }
  })
}

export function isAnswerCitationSlot(
  value: unknown,
): value is AnswerCitationSlot {
  return (
    !!value &&
    typeof value === "object" &&
    "_id" in value &&
    typeof value._id === "string" &&
    "chunkId" in value &&
    typeof value.chunkId === "string" &&
    "liveTitle" in value &&
    typeof value.liveTitle === "string" &&
    "excerpt" in value &&
    typeof value.excerpt === "string" &&
    "canNavigate" in value &&
    typeof value.canNavigate === "boolean"
  )
}

/** Normalize stream catalog or persisted chat.list enrichment into slots. */
export function asAnswerCitationSlots(
  citations: Array<{
    _id: string
    chunkId?: string | null
    sourceId?: string | null
    liveTitle: string
    excerpt: string
    canNavigate: boolean
    locator?: {
      startOffset?: number
      endOffset?: number
      ordinal?: number
    } | null
  }>,
): AnswerCitationSlot[] {
  return citations.flatMap((citation) => {
    if (!citation.chunkId) {
      return []
    }

    return [
      {
        _id: citation._id,
        chunkId: String(citation.chunkId),
        sourceId: citation.sourceId ? String(citation.sourceId) : undefined,
        liveTitle: citation.liveTitle,
        excerpt: citation.excerpt,
        canNavigate: citation.canNavigate,
        locator: citation.locator,
      },
    ]
  })
}
