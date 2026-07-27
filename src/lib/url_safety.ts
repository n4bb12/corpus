const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^0\.0\.0\.0$/,
]

const METADATA_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.google",
  "169.254.169.254",
])

export type UrlValidationResult =
  | { ok: true; url: URL }
  | { ok: false; error: string }

export function validatePublicHttpUrl(raw: string): UrlValidationResult {
  let url: URL

  try {
    url = new URL(raw.trim())
  } catch {
    return { ok: false, error: "Enter a valid public HTTP or HTTPS URL." }
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      error: "Only public HTTP and HTTPS URLs are supported.",
    }
  }

  if (url.username || url.password) {
    return { ok: false, error: "URLs with credentials are not allowed." }
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "")

  if (METADATA_HOSTS.has(hostname.toLowerCase())) {
    return { ok: false, error: "That host is blocked for security reasons." }
  }

  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return {
      ok: false,
      error: "Private or local network URLs are not allowed.",
    }
  }

  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) {
    return {
      ok: false,
      error: "Private or local network URLs are not allowed.",
    }
  }

  return { ok: true, url }
}

export function isBlockedResolvedAddress(address: string) {
  const host = address.replace(/^\[|\]$/g, "")

  if (METADATA_HOSTS.has(host.toLowerCase())) {
    return true
  }

  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    return true
  }

  return /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
}
