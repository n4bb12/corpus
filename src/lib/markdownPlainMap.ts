type MappedSpan = {
  text: string
  /** Plain/collapsed index → original markdown index. */
  map: number[]
}

function pushChar(
  chars: string[],
  map: number[],
  char: string,
  origin: number,
) {
  chars.push(char)
  map.push(origin)
}

function consumePrefix(rest: string, pattern: RegExp) {
  const match = rest.match(pattern)

  if (!match?.[0]) {
    return null
  }

  return match[0].length
}

/** Strip common markdown syntax while mapping each visible char to its source index. */
export function stripMarkdownWithMap(markdown: string): MappedSpan {
  const chars: string[] = []
  const map: number[] = []
  let index = 0

  const emitRange = (from: number, to: number) => {
    for (let position = from; position < to; position += 1) {
      const char = markdown.charAt(position)

      pushChar(chars, map, char, position)
    }
  }

  while (index < markdown.length) {
    const rest = markdown.slice(index)

    if (/^```/.test(rest)) {
      const close = markdown.indexOf("```", index + 3)

      if (close < 0) {
        index = markdown.length
        break
      }

      index = close + 3
      continue
    }

    if (markdown.charAt(index) === "`") {
      const close = markdown.indexOf("`", index + 1)

      if (close < 0) {
        index += 1
        continue
      }

      emitRange(index + 1, close)
      index = close + 1
      continue
    }

    if (/^!\[/.test(rest)) {
      const altEnd = markdown.indexOf("]", index + 2)
      const parenStart = altEnd >= 0 ? markdown.indexOf("(", altEnd) : -1
      const parenEnd = parenStart >= 0 ? markdown.indexOf(")", parenStart) : -1

      if (altEnd >= 0 && parenEnd >= 0) {
        emitRange(index + 2, altEnd)
        index = parenEnd + 1
        continue
      }
    }

    if (markdown.charAt(index) === "[") {
      const labelEnd = markdown.indexOf("]", index + 1)
      const parenStart = labelEnd >= 0 ? markdown.indexOf("(", labelEnd) : -1
      const parenEnd = parenStart >= 0 ? markdown.indexOf(")", parenStart) : -1

      if (labelEnd >= 0 && parenEnd >= 0) {
        emitRange(index + 1, labelEnd)
        index = parenEnd + 1
        continue
      }
    }

    if (/^(\*\*|__)/.test(rest)) {
      const marker = rest.startsWith("**") ? "**" : "__"
      const close = markdown.indexOf(marker, index + marker.length)

      if (close >= 0) {
        emitRange(index + marker.length, close)
        index = close + marker.length
        continue
      }
    }

    if (/^(\*|_)/.test(rest) && !/^(\*\*|__)/.test(rest)) {
      const marker = rest.charAt(0)
      const close = markdown.indexOf(marker, index + 1)

      if (close >= 0) {
        emitRange(index + 1, close)
        index = close + 1
        continue
      }
    }

    if (/^~~/.test(rest)) {
      const close = markdown.indexOf("~~", index + 2)

      if (close >= 0) {
        emitRange(index + 2, close)
        index = close + 2
        continue
      }
    }

    const lineStart = index === 0 || markdown.charAt(index - 1) === "\n"

    if (lineStart && /^#{1,6}\s/.test(rest)) {
      const consumed = consumePrefix(rest, /^#{1,6}\s+/)

      if (consumed) {
        index += consumed
        continue
      }
    }

    if (lineStart && /^\s{0,3}>\s?/.test(rest)) {
      const consumed = consumePrefix(rest, /^\s{0,3}>\s?/)

      if (consumed) {
        index += consumed
        continue
      }
    }

    if (lineStart && /^\s*[-*+]\s+/.test(rest)) {
      const consumed = consumePrefix(rest, /^\s*[-*+]\s+/)

      if (consumed) {
        index += consumed
        continue
      }
    }

    if (lineStart && /^\s*\d+\.\s+/.test(rest)) {
      const consumed = consumePrefix(rest, /^\s*\d+\.\s+/)

      if (consumed) {
        index += consumed
        continue
      }
    }

    const char = markdown.charAt(index)

    pushChar(chars, map, char, index)
    index += 1
  }

  return { text: chars.join(""), map }
}

export function collapseMappedSpan(span: MappedSpan): MappedSpan {
  const chars: string[] = []
  const map: number[] = []
  let pendingSpace = false
  let started = false

  for (let index = 0; index < span.text.length; index += 1) {
    const char = span.text.charAt(index)
    const origin = span.map[index]

    if (typeof origin !== "number") {
      continue
    }

    if (/\s/.test(char)) {
      if (started) {
        pendingSpace = true
      }

      continue
    }

    if (pendingSpace) {
      chars.push(" ")
      map.push(origin)
      pendingSpace = false
    }

    chars.push(char)
    map.push(origin)
    started = true
  }

  return { text: chars.join(""), map }
}

export function locateInMappedSpan(span: MappedSpan, needle: string) {
  const trimmed = needle.trim()

  if (!trimmed) {
    return null
  }

  const collapsedNeedle = trimmed.replace(/\s+/g, " ")
  const index = span.text.indexOf(collapsedNeedle)

  if (index < 0) {
    return null
  }

  const start = span.map[index]
  const endIndex = index + collapsedNeedle.length - 1
  const endOrigin = span.map[endIndex]

  if (typeof start !== "number" || typeof endOrigin !== "number") {
    return null
  }

  return { start, end: endOrigin + 1 }
}
