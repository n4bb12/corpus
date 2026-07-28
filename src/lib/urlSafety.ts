import ipaddr from "ipaddr.js"

const METADATA_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.google",
  "metadata",
  "169.254.169.254",
])

const BLOCKED_IP_RANGES = new Set([
  "unspecified",
  "broadcast",
  "multicast",
  "linkLocal",
  "loopback",
  "private",
  "reserved",
  "carrierGradeNat",
  "uniqueLocal",
  "benchmarking",
  "discard",
  "amdIPv6",
  "as112V4",
  "as112",
  "orchid",
  "orchid2",
  "6to4",
  "teredo",
  "ipv4Mapped",
])

export type UrlValidationResult =
  | { ok: true; url: URL }
  | { ok: false; error: string }

function hostnameLooksLikeIp(hostname: string) {
  return ipaddr.isValid(hostname)
}

function effectiveIpRange(address: string) {
  const parsed = ipaddr.parse(address)

  if (
    parsed.kind() === "ipv6" &&
    "isIPv4MappedAddress" in parsed &&
    parsed.isIPv4MappedAddress()
  ) {
    return parsed.toIPv4Address().range()
  }

  return parsed.range()
}

/** True when a hostname or resolved address must not be fetched. */
export function isBlockedResolvedAddress(address: string) {
  const host = address.replace(/^\[|\]$/g, "")

  if (METADATA_HOSTS.has(host.toLowerCase())) {
    return true
  }

  if (!hostnameLooksLikeIp(host)) {
    return false
  }

  try {
    return BLOCKED_IP_RANGES.has(effectiveIpRange(host))
  } catch {
    return true
  }
}

/** Accept public http(s) URLs only — no credentials, localhost, or private nets. */
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

  if (!hostname) {
    return { ok: false, error: "Enter a valid public HTTP or HTTPS URL." }
  }

  if (METADATA_HOSTS.has(hostname.toLowerCase())) {
    return { ok: false, error: "That host is blocked for security reasons." }
  }

  if (hostname.toLowerCase() === "localhost") {
    return {
      ok: false,
      error: "Private or local network URLs are not allowed.",
    }
  }

  if (hostnameLooksLikeIp(hostname) && isBlockedResolvedAddress(hostname)) {
    return {
      ok: false,
      error: "Private or local network URLs are not allowed.",
    }
  }

  return { ok: true, url }
}
