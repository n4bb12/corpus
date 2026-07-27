export function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function quotaResetMessage(
  kind: "ingestion" | "generation",
  dateKey: string,
) {
  const label = kind === "ingestion" ? "source additions" : "chat answers"
  return `Daily ${label} limit reached. It resets after ${dateKey} UTC.`
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
