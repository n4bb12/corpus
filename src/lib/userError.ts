import { ConvexError } from "convex/values"

function readConvexErrorData(error: unknown) {
  if (error instanceof ConvexError) {
    return error.data
  }

  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "ConvexError" &&
    "data" in error
  ) {
    return error.data
  }

  return undefined
}

function messageFromConvexData(data: unknown) {
  if (typeof data === "string") {
    const trimmed = data.trim()

    return trimmed || null
  }

  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    const trimmed = data.message.trim()

    return trimmed || null
  }

  return null
}

/** Pull the app message out of Convex's hybrid client error text. */
export function stripConvexErrorWrapper(message: string) {
  const uncaught = message.match(/Uncaught (?:Error|ConvexError):\s*/)

  if (!uncaught || uncaught.index === undefined) {
    if (/\[CONVEX\s/.test(message) || /\bServer Error\b/.test(message)) {
      return null
    }

    const trimmed = message.trim()

    return trimmed || null
  }

  let rest = message.slice(uncaught.index + uncaught[0].length)
  const stackStart = rest.search(/\s+at\s+(?:async\s+)?[\w$.]+\s*(?:\(|$)/)

  if (stackStart >= 0) {
    rest = rest.slice(0, stackStart)
  }

  rest = rest.replace(/\s+Called by client\s*$/i, "").trim()

  return rest || null
}

function rawErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }

  return null
}

/**
 * User-facing copy for any thrown value. Prefers ConvexError `.data`,
 * then strips Convex request wrappers from plain Error messages.
 */
export function formatUserError(
  error: unknown,
  fallback = "Something went wrong. Try again.",
) {
  const fromData = messageFromConvexData(readConvexErrorData(error))

  if (fromData) {
    return fromData
  }

  const raw = rawErrorMessage(error)

  if (!raw?.trim()) {
    return fallback
  }

  return stripConvexErrorWrapper(raw) ?? fallback
}
