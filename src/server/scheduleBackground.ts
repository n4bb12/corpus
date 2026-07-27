import { waitUntil as vercelWaitUntil } from "@vercel/functions"

/**
 * Keep work alive after the response is sent.
 * On Vercel, uses `waitUntil`. Locally (no request context), the promise
 * still runs on the Node event loop via the detached reference.
 */
export function scheduleBackground(task: Promise<unknown>) {
  const tracked = task.catch(() => {
    // Errors are handled inside the task (e.g. markFailed).
  })

  vercelWaitUntil(tracked)
}
