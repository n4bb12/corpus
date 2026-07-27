export type EvidencePromptChunk = {
  chunkId: string
  sourceId: string
  text: string
}

/**
 * Flatten evidence for factual answers (stable global order).
 */
export function formatFlatEvidence(evidence: EvidencePromptChunk[]) {
  if (!evidence.length) {
    return "(none)"
  }

  return evidence
    .map(
      (item, index) =>
        `[${index + 1}] chunk:${item.chunkId} source:${item.sourceId}\n${item.text}`,
    )
    .join("\n\n")
}

/**
 * Group evidence under source titles so corpus tasks cannot ignore unlabeled ids.
 */
export function formatCorpusEvidence(
  evidence: EvidencePromptChunk[],
  sourceTitleById: Map<string, string>,
  selectedSourceIds: string[],
) {
  if (!evidence.length) {
    return "(none)"
  }

  const bySource = new Map<string, EvidencePromptChunk[]>()

  for (const item of evidence) {
    const list = bySource.get(item.sourceId)

    if (list) {
      list.push(item)
    } else {
      bySource.set(item.sourceId, [item])
    }
  }

  const orderedIds = [
    ...selectedSourceIds.filter((id) => bySource.has(id)),
    ...[...bySource.keys()].filter((id) => !selectedSourceIds.includes(id)),
  ]

  const sections: string[] = []
  let index = 0

  for (const sourceId of orderedIds) {
    const chunks = bySource.get(sourceId)

    if (!chunks?.length) {
      continue
    }

    const title = sourceTitleById.get(sourceId)?.trim() || "Untitled source"
    const body = chunks
      .map((item) => {
        index += 1
        return `[${index}] chunk:${item.chunkId}\n${item.text}`
      })
      .join("\n\n")

    sections.push(`### ${title}\nsourceId:${sourceId}\n\n${body}`)
  }

  const missing = selectedSourceIds.filter((id) => !bySource.has(id))

  if (missing.length) {
    const labels = missing.map((id) => {
      const title = sourceTitleById.get(id)?.trim() || id
      return `- ${title} (sourceId:${id})`
    })

    sections.push(
      `### Sources with no evidence in this pack\n${labels.join("\n")}`,
    )
  }

  return sections.join("\n\n")
}
