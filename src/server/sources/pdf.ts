import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { requireEnv } from "src/lib/env"
import { MODELS } from "src/lib/limits"
import {
  cleanPdfText,
  isUsefulPdfText,
  trustedNativePdfText,
} from "src/lib/pdfText"

function titleFromMetadata(title: string | null | undefined) {
  if (typeof title !== "string") {
    return null
  }

  const trimmed = title.trim()

  return trimmed ? trimmed : null
}

async function extractPdfViaPdfvision(buffer: Buffer) {
  const { ensureDomMatrix } = await import("src/server/polyfills/dommatrix")

  ensureDomMatrix()

  const { processDocument } = await import("pdfvision")
  const result = await processDocument("document.pdf", {
    sourceData: new Uint8Array(buffer),
    noCache: true,
  })

  return {
    title: titleFromMetadata(result.metadata.title),
    text: trustedNativePdfText(result.pages),
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
  const native = await extractPdfViaPdfvision(buffer)

  if (isUsefulPdfText(native.text)) {
    return {
      title: native.title,
      markdown: cleanPdfText(native.text),
    }
  }

  const vision = await extractPdfViaVision(buffer)

  if (!isUsefulPdfText(vision)) {
    throw new Error(
      "This PDF has no readable text. Try a text-based export or paste the text.",
    )
  }

  return {
    title: native.title,
    markdown: cleanPdfText(vision),
  }
}
