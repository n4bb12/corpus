import dns from "node:dns/promises"
import { LIMITS } from "src/lib/limits"
import {
  isBlockedResolvedAddress,
  validatePublicHttpUrl,
} from "src/lib/urlSafety"

export async function assertSafeUrl(raw: string) {
  const validated = validatePublicHttpUrl(raw)

  if (!validated.ok) {
    throw new Error(validated.error)
  }

  const records = await dns.lookup(validated.url.hostname, { all: true })

  for (const record of records) {
    if (isBlockedResolvedAddress(record.address)) {
      throw new Error("That address isn't allowed.")
    }
  }

  return validated.url
}

export async function fetchPublicHtml(url: URL) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    let current = url
    let response: Response | null = null

    for (let redirect = 0; redirect < 4; redirect += 1) {
      await assertSafeUrl(current.toString())
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "CorpusBot/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location")

        if (!location) {
          throw new Error("The URL redirected in a way we couldn't follow.")
        }

        current = new URL(location, current)
        continue
      }

      break
    }

    if (!response?.ok) {
      throw new Error("Couldn't fetch that URL.")
    }

    const contentType = response.headers.get("content-type") ?? ""

    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error("Only web pages (HTML) can be added from a URL.")
    }

    const reader = response.body?.getReader()

    if (!reader) {
      throw new Error("That URL returned no content.")
    }

    const chunks: Uint8Array[] = []
    let total = 0

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      if (!value) {
        continue
      }

      total += value.byteLength

      if (total > LIMITS.maxUrlResponseBytes) {
        throw new Error(
          `Pages can be at most ${LIMITS.maxUrlResponseBytes / (1024 * 1024)} MB.`,
        )
      }

      chunks.push(value)
    }

    const html = new TextDecoder().decode(
      Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
    )

    return { html, finalUrl: current.toString() }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Prefer `<main>` when present, otherwise `<body>`.
 *
 * Do not narrow to `<article>`: product cards, teasers, and other page regions
 * commonly use it, and selecting one (or only articles) can drop most of the page.
 */
export async function extractReadableHtml(html: string) {
  const { load } = await import("cheerio")
  const $ = load(html)
  const title = $("title").first().text().trim() || null

  $("script, style, noscript").remove()

  const main =
    $("main").first().html() ??
    $("body").first().html() ??
    $.root().html() ??
    html

  return { title, html: main }
}
