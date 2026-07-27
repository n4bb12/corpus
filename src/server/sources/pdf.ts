import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { requireEnv } from "src/lib/env"
import { MODELS } from "src/lib/limits"
import {
  cleanPdfText,
  isUsefulPdfText,
  type PdfTextItem,
  textFromPdfContentItems,
} from "src/lib/pdfText"

async function loadPdfJs() {
  const { ensureDomMatrix } = await import("src/server/polyfills/dommatrix")

  ensureDomMatrix()

  return import("pdfjs-dist/legacy/build/pdf.mjs")
}

function pdfTextItemsFromContent(
  items: Array<
    | {
        str?: string
        hasEOL?: boolean
        transform?: number[]
        height?: number
        width?: number
      }
    | { type: string }
  >,
) {
  const result: PdfTextItem[] = []

  for (const item of items) {
    if (!("str" in item) || typeof item.str !== "string") {
      continue
    }

    result.push({
      str: item.str,
      hasEOL: item.hasEOL,
      transform: item.transform,
      height: item.height,
      width: item.width,
    })
  }

  return result
}

async function extractPdfTextLayer(buffer: Buffer) {
  const pdfjs = await loadPdfJs()
  const data = new Uint8Array(buffer)
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise

  try {
    const pages: string[] = []

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber)
      const content = await page.getTextContent()

      pages.push(
        textFromPdfContentItems(pdfTextItemsFromContent(content.items)),
      )
    }

    return cleanPdfText(pages.join("\n\n"))
  } finally {
    await doc.destroy()
  }
}

/** Fallback for scanned / empty-text PDFs. Avoids @napi-rs/canvas (missing on Vercel). */
async function extractPdfViaVision(buffer: Buffer) {
  const openai = createOpenAI({
    apiKey: requireEnv("OPENAI_API_KEY"),
  })
  const result = await generateText({
    model: openai(MODELS.chat),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all readable text from this PDF as clean markdown. Preserve headings, lists, and paragraph breaks (blank lines between paragraphs). Do not invent content. Return only the extracted text.",
          },
          {
            type: "file",
            mediaType: "application/pdf",
            data: buffer,
          },
        ],
      },
    ],
  })

  return result.text.trim()
}

export async function extractPdfMarkdown(buffer: Buffer) {
  const layered = await extractPdfTextLayer(buffer)

  if (isUsefulPdfText(layered)) {
    return {
      title: null as string | null,
      markdown: layered,
    }
  }

  const vision = await extractPdfViaVision(buffer)

  if (!isUsefulPdfText(vision)) {
    throw new Error(
      "This PDF has no readable text. Try a text-based export or paste the text.",
    )
  }

  return {
    title: null as string | null,
    markdown: vision,
  }
}
