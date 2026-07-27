export function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function quotaResetMessage(kind: "ingestion" | "generation") {
  if (kind === "ingestion") {
    return "You've reached today's limit for adding sources. Try again tomorrow."
  }

  return "You've reached today's chat limit. Try again tomorrow."
}

export function remainingQuota(used: number, limit: number) {
  return Math.max(0, limit - used)
}

export function assertWithinQuota(
  used: number,
  limit: number,
  message: string,
) {
  if (used >= limit) {
    throw new Error(message)
  }
}
