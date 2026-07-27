import { marked } from "marked"
import {
  type ChatCiteArgs,
  CitationPills,
} from "src/components/chat/CitationPills"
import { splitCitedParagraphs, stripCitationMarkers } from "src/lib/citations"

type ChatCitation = {
  _id: string
  liveTitle: string
  excerpt: string
  canNavigate: boolean
  sourceId?: string
  locator?: { startOffset?: number; endOffset?: number } | null
}

export type AssistantContentProps = {
  content: string
  citations: ChatCitation[]
  insufficient?: boolean
  streaming?: boolean
  onCite: (args: ChatCiteArgs) => void
}

export function AssistantContent({
  content,
  citations,
  insufficient = false,
  streaming = false,
  onCite,
}: AssistantContentProps) {
  const visibleCitations = insufficient ? [] : citations
  const displayContent = insufficient ? stripCitationMarkers(content) : content
  const hasInlineMarkers = /\[\[cite:\d+\]\]/.test(displayContent)
  const caret = streaming ? (
    <span className="streaming-caret" aria-hidden="true" />
  ) : null

  if (!visibleCitations.length || !hasInlineMarkers) {
    const html = marked.parse(stripCitationMarkers(displayContent), {
      async: false,
    }) as string

    return (
      <div className="space-y-3">
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {visibleCitations.length ? (
          <CitationPills
            citations={visibleCitations}
            indexes={visibleCitations.map((_, index) => index + 1)}
            onCite={onCite}
          />
        ) : null}
        {caret}
      </div>
    )
  }

  const paragraphs = splitCitedParagraphs(displayContent)

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph) => {
        const html = paragraph.text
          ? (marked.parse(paragraph.text, { async: false }) as string)
          : ""
        const key = `${paragraph.text}:${paragraph.citationIndexes.join(",")}`

        return (
          <div key={key} className="space-y-2">
            {html ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : null}
            {paragraph.citationIndexes.length ? (
              <CitationPills
                citations={visibleCitations}
                indexes={paragraph.citationIndexes}
                onCite={onCite}
              />
            ) : null}
          </div>
        )
      })}
      {caret}
    </div>
  )
}
