# Chat interface adjustments
_Exported on 7/26/2026 at 03:49:11 GMT+2 from Cursor (3.13.10)_

---

**User**

Make these fixes and adjustments. Make commits for each change as you go.

- Enable TanStack Start prerendering.
- Notebooks should receive an automatic name based on the summarized content of the first source as soon as it is added.
- Create new sources with empty title. Display "Untitled notebook" in readonly mode as a fallback text. Input is empty on edit in that case.
- Larger chat input font size. Chat input floats above scrollable message thread. No top border / separator.
- Remove the last-used input border.
- Sending a chat message adds the message to the thread but there is no response indication yet. We planned a shimmering text that updates based on status events from the SSE stream for things like vectorization, reranking, answer TTFT, etc. (in a non-technical language). But there is currently no feedback.
- After a timeout, chat requests fail with "[vite] 3:33:07 AM [vite] Internal server error: The socket connection was closed unexpectedly. For more information, pass `verbose: true` in the second argument to fetch()" with no further info. There is error feedback above the chat input but no error indication in the thread and no retry button.

---

**Cursor**

I'll work through these one by one with a commit per change. First I'll map the relevant prerender, notebook naming, chat UI, and SSE error-handling code.

Next I’ll check how title generation is triggered and what the plan says about chat status events.

Starting with prerendering, then working through notebook titles and the chat feedback fixes.

Next: empty notebook titles with an Untitled fallback, then earlier auto-naming.

Moving auto-title generation to run as soon as the first source is extracted.

Implementing SSE status events with shimmer feedback, then error/retry handling.

All seven changes are in, each as its own commit:

1. **Prerendering** — `tanstackStart({ prerender: { enabled: true, crawlLinks: true } })`
2. **Empty notebook titles** — stored as `""`; UI shows “Untitled notebook” when readonly; edit starts empty
3. **Auto-title** — runs as soon as the first source is extracted (not after embeddings)
4. **Chat composer** — larger `text-base` input, floats over the thread, no top border
5. **Last used** — removed the ring highlight on email/Google sign-in
6. **Status feedback** — SSE `status` events + Convex `progressLabel` with shimmering copy (“Looking through your sources…”, “Searching…”, “Picking the best matches…”, “Writing an answer…”)
7. **Failures** — interrupted/timeout turns are marked failed in the thread with an error card and **Retry**; evidence work now runs inside the stream so the connection isn’t held silent upfront

`bun fix`, types, and tests all pass.

---

**User**

Increase sources modal size. Change ration to 3:2.

---

**Cursor**

Add source dialog is now larger (`sm:max-w-3xl`, up from `32rem`) with a `3:2` aspect ratio.

---

**User**

We got further but on openai errors, we still don't show error feedback (in this case none whatsoever) and no retry. (the error was insufficient_quota but that's not the main issue).

---

**Cursor**

I'll trace how OpenAI failures flow through the chat SSE path and why they never become a failed thread message with Retry.

The client treats a finished SSE stream as success and never reads `error` events, so OpenAI failures can leave the assistant blank. I'll parse SSE on the client and harden server-side finalization.

Adding a UI fallback for already-stuck empty assistant turns from earlier failures:

OpenAI failures were finishing the SSE stream without the client treating them as errors, so the assistant slot could end up blank with no Retry.

Fixed by:
1. **Consuming SSE events on the client** — `error` / missing `done` now mark the turn failed and surface Retry
2. **Hardening the server path** — watch `result.stream` error parts, reject empty answers, always finalize as failed with a readable message (including quota)
3. **Recovering stuck empty “complete” turns** — those now show the failure card + Retry too

`insufficient_quota` should now show something like “The AI provider is out of quota. Try again later.” in the thread with a Retry button.

