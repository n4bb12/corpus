# Source digests for corpus summaries and notebook titles

## Why

One-shot coverage packing + prompt pressure fails for “summarize all sources”: the model latches onto one source. Precomputed per-source digests give a balanced, titled map of the notebook (≤20 sources) and also improve automatic titles.

## Goals

1. Generate a grounded **source digest** at ingest (with supporting chunk quotes for citations).
2. Answer **corpus summary / brief / overview** questions from digests, not raw chunk coverage packs.
3. Derive / **refresh notebook titles** from digests as ready sources are added or removed — unless the user set the title manually.
4. **Clearing the notebook title** returns ownership to automatic naming (re-run digest-based title refresh).
5. Keep **hybrid RAG** for factual questions; keep coverage packing only as a fallback for non-summary corpus tasks (compare / contradict) if needed.

## Data model

Extend `sources` ([`schema.ts`](src/convex/schema.ts)):

- `digestStatus`: `"pending" | "ready" | "failed"` (optional until backfill)
- `digestText`: short markdown summary of the source (≈400–800 chars)
- `digestCitations`: array of `{ chunkId, quote, locator? }` — verbatim supports stored at digest time

Processing: summarize **before** `ready` so chat unlock and corpus path always see digests:

`extracting → chunking → embedding → summarizing → ready`

## Ingest pipeline

In [`processSource.ts`](src/server/sources/processSource.ts), after `replaceChunks`:

1. Set processing state `summarizing`.
2. Call OpenAI (nano/mini) with source markdown (or packed early chunks) → structured `{ digestText, citations: [{ chunkId, quote }] }`.
3. Validate quotes against chunk texts (reuse citation quote matching).
4. Persist digest fields; then `markReady`.
5. Schedule `refreshNotebookTitle(notebookId)`.

Stop scheduling title generation from `setExtracted` ([`ingestion.ts`](src/convex/ingestion.ts)) — too early and uses raw markdown slice.

On digest failure: still `markReady` with `digestStatus: "failed"` so factual chat works; corpus summary falls back to coverage pack for that source or omits it with a clear gap.

## Chat / retrieval

Classify stays (`factual` | `corpus`). Summary-like corpus prompts use digests; compare/contradict can use digests first with coverage fallback.

**Summary path** in [`prepareEvidence`](src/convex/retrieval.ts):

1. Load digests for selected ready sources.
2. Build evidence as titled digest sections; citations allowed = digest citation chunk ids.
3. Answer prompt: synthesize from digests; cite only provided digest quotes / chunk ids; cover every selected source that has a digest.

## Notebook titles

Change policy from “generate once from first source, never again”:

- **`titleOrigin === "manual"`** with a non-empty title — never overwrite.
- **`placeholder` or `generated`** — refresh from digests of all non-deleted **ready** sources.
- **Clearing the title** (rename to empty / whitespace-only):
  - Set `title` to `""`, `titleOrigin` to `"placeholder"`, `titleGenerationState` to `"pending"`.
  - Schedule `refreshNotebookTitle` so ready sources refill the name (spinner + “Generating title…” while pending).
  - Non-empty rename stays `manual`.
  - Implemented now (uses source markdown until digests land).

`refreshNotebookTitle(notebookId)`:

1. No-op if `titleOrigin === "manual"`.
2. Collect ready sources with `digestText` (≤20).
3. If none: leave empty placeholder.
4. If one or many: nano title from digest(s) (same ≤5-word rules).
5. Apply with `titleOrigin: "generated"`.

Triggers:

- After a source digest is saved / ready
- After source delete
- After title clear (empty rename)
- Debounce / latest-wins token so burst uploads don’t thrash

Update [`applyGeneratedTitle`](src/convex/titlesHelpers.ts) to allow overwrite when `titleOrigin` is `placeholder` **or** `generated`.

## UI / product

- Empty-state “concise brief” exercises the digest path.
- Clearing the inline notebook title is the escape hatch back to auto-naming (no extra control required).
- Digests need not appear in Sources UI in v1.
- Existing sources without digests: lazy backfill on first corpus summary turn.

## Out of scope

- Map-reduce multi-pass contradiction engine beyond digests
- Raising evidence budget
- Showing digests in the source preview UI
- Regenerating digests (content is immutable)

## Implementation order

1. Schema + digest generation in ingest (before ready)
2. `prepareEvidence` summary path from digests + answer prompt
3. `refreshNotebookTitle` from digests; wire add/delete/clear-title; stop early title-from-markdown
4. Lazy backfill for old sources; tests for digest quotes, evidence formatting, rename-clear → auto, title refresh guards

## Primary files

- [`src/convex/schema.ts`](src/convex/schema.ts)
- [`src/server/sources/processSource.ts`](src/server/sources/processSource.ts)
- [`src/convex/ingestion.ts`](src/convex/ingestion.ts)
- [`src/convex/retrieval.ts`](src/convex/retrieval.ts)
- [`src/server/chat/handleChatPost.ts`](src/server/chat/handleChatPost.ts)
- [`src/convex/titles.ts`](src/convex/titles.ts) / [`titlesHelpers.ts`](src/convex/titlesHelpers.ts)
- [`src/convex/notebooks.ts`](src/convex/notebooks.ts) — empty rename → placeholder + refresh
- [`src/lib/evidencePrompt.ts`](src/lib/evidencePrompt.ts)
