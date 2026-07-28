import { ConvexError } from "convex/values"

/** Throw a user-facing application error (survives production redaction). */
export function appError(message: string): never {
  throw new ConvexError(message)
}
