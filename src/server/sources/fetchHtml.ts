import dns from "node:dns/promises"
import type { IncomingMessage } from "node:http"
import http from "node:http"
import https from "node:https"
import { LIMITS } from "src/lib/limits"
import {
  isBlockedResolvedAddress,
  validatePublicHttpUrl,
} from "src/lib/urlSafety"

export type SafeResolvedUrl = {
  url: URL
  address: string
  family: number
}

export async function assertSafeUrl(raw: string): Promise<SafeResolvedUrl> {
  const validated = validatePublicHttpUrl(raw)

  if (!validated.ok) {
    throw new Error(validated.error)
  }

  const records = await dns.lookup(validated.url.hostname, { all: true })

  if (!records.length) {
    throw new Error("Couldn't resolve that host.")
  }

  for (const record of records) {
    if (isBlockedResolvedAddress(record.address)) {
      throw new Error("That address isn't allowed.")
    }
  }

  const [first] = records

  if (!first) {
    throw new Error("Couldn't resolve that host.")
  }

  return {
    url: validated.url,
    address: first.address,
    family: first.family,
  }
}

function requestPinned(
  target: SafeResolvedUrl,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  const { url, address, family } = target
  const lib = url.protocol === "https:" ? https : http
  const headers: Record<string, string> = {
    Host: url.host,
    "User-Agent": "CorpusBot/1.0",
    Accept: "text/html,application/xhtml+xml",
  }

  return new Promise((resolve, reject) => {
    const request = lib.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers,
        signal,
        servername: url.hostname,
        lookup(_hostname, _options, callback) {
          callback(null, address, family)
        },
      },
      resolve,
    )

    request.on("error", reject)
    request.end()
  })
}

async function readLimitedBody(response: IncomingMessage) {
  const chunks: Buffer[] = []
  let total = 0

  for await (const chunk of response) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.byteLength

    if (total > LIMITS.maxUrlResponseBytes) {
      response.destroy()
      throw new Error(
        `Pages can be at most ${LIMITS.maxUrlResponseBytes / (1024 * 1024)} MB.`,
      )
    }

    chunks.push(buffer)
  }

  return Buffer.concat(chunks).toString("utf8")
}

export async function fetchPublicHtml(url: URL) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    let current = url
    let response: IncomingMessage | null = null

    for (let redirect = 0; redirect < 4; redirect += 1) {
      const resolved = await assertSafeUrl(current.toString())
      response = await requestPinned(resolved, controller.signal)
      const status = response.statusCode ?? 0

      if (status >= 300 && status < 400) {
        const location = response.headers.location

        if (typeof location !== "string" || !location) {
          throw new Error("The URL redirected in a way we couldn't follow.")
        }

        response.resume()
        current = new URL(location, current)
        continue
      }

      break
    }

    const status = response?.statusCode ?? 0

    if (!response || status < 200 || status >= 300) {
      throw new Error("Couldn't fetch that URL.")
    }

    const contentType = String(response.headers["content-type"] ?? "")

    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error("Only web pages (HTML) can be added from a URL.")
    }

    const html = await readLimitedBody(response)

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
