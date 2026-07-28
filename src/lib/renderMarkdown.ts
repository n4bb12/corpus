import { marked, Renderer, type Tokens } from "marked"

function isSafeHref(href: string, kind: "link" | "image") {
  if (kind === "image") {
    return /^https?:/i.test(href)
  }

  return /^(https?:|mailto:|#)/i.test(href)
}

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

class SafeMarkdownRenderer extends Renderer {
  html() {
    return ""
  }

  link({ href, title, tokens }: Tokens.Link) {
    const text = this.parser.parseInline(tokens)
    const safe =
      typeof href === "string" && isSafeHref(href, "link") ? href : null

    if (!safe) {
      return text
    }

    const titleAttr = title ? ` title="${escapeAttribute(title)}"` : ""

    return `<a href="${escapeAttribute(safe)}"${titleAttr}>${text}</a>`
  }

  image({ href, title, text }: Tokens.Image) {
    const safe =
      typeof href === "string" && isSafeHref(href, "image") ? href : null

    if (!safe) {
      return escapeAttribute(text || "")
    }

    const titleAttr = title ? ` title="${escapeAttribute(title)}"` : ""

    return `<img src="${escapeAttribute(safe)}" alt="${escapeAttribute(text || "")}"${titleAttr}>`
  }
}

const safeRenderer = new SafeMarkdownRenderer()

/** Parse Markdown to HTML, stripping raw HTML and unsafe link/image URLs. */
export function renderMarkdownHtml(markdown: string) {
  return marked.parse(markdown, {
    async: false,
    renderer: safeRenderer,
  }) as string
}
