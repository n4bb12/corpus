import { marked } from "marked"
import {
  type ChatCiteArgs,
  CitationPills,
} from "src/components/chat/CitationPills"
import { CitationPillsPending } from "src/components/chat/CitationPillsPending"
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
  /** Trailing paragraph cites are held until they finish; show placeholders meanwhile. */
  citationsPending?: boolean
  onCite: (args: ChatCiteArgs) => void
}

export function AssistantContent({
  content,
  citations,
  insufficient = false,
  citationsPending = false,
  onCite,
}: AssistantContentProps) {
  const visibleCitations = insufficient ? [] : citations
  const displayContent = insufficient ? stripCitationMarkers(content) : content
  const hasInlineMarkers = /\[\[cite:\d+\]\]/.test(displayContent)
  const showPending = citationsPending && !insufficient

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
        ) : showPending ? (
          <CitationPillsPending />
        ) : null}
      </div>
    )
  }

  const paragraphs = splitCitedParagraphs(displayContent)

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => {
        const hasPills = !!paragraph.citationIndexes.length
        const html = paragraph.text
          ? (marked.parse(paragraph.text, { async: false }) as string)
          : ""
        const key = `${paragraph.text}:${paragraph.citationIndexes.join(",")}`
        const isTrailing = index === paragraphs.length - 1

        return (
          <div key={key} className="space-y-2">
            {html ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : null}
            {hasPills ? (
              <CitationPills
                citations={visibleCitations}
                indexes={paragraph.citationIndexes}
                onCite={onCite}
              />
            ) : showPending && isTrailing ? (
              <CitationPillsPending />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
