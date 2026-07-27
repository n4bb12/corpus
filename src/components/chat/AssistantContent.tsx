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
  onCite: (args: ChatCiteArgs) => void
}

export function AssistantContent({
  content,
  citations,
  onCite,
}: AssistantContentProps) {
  const hasInlineMarkers = /\[\[cite:\d+\]\]/.test(content)

  if (!citations.length || !hasInlineMarkers) {
    const html = marked.parse(stripCitationMarkers(content), {
      async: false,
    }) as string

    return (
      <div className="space-y-3">
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {citations.length ? (
          <CitationPills
            citations={citations}
            indexes={citations.map((_, index) => index + 1)}
            onCite={onCite}
          />
        ) : null}
      </div>
    )
  }

  const paragraphs = splitCitedParagraphs(content)

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
                citations={citations}
                indexes={paragraph.citationIndexes}
                onCite={onCite}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
