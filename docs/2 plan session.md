# NotebookLM clone plan
_Exported on 7/25/2026 at 04:38:03 GMT+2 from Cursor (3.13.10)_

---

**User**

Create a plan for a NotebookLM clone. It should have the core feature set of NLM:
- User accounts. Sign in with Google or email/password account.
- Book/Library-like icon + name "Corpus" in the top left corner.
- Theme switcher and account menu in the top right corner
- Notebooks overview. Create and search notebooks. Shows at most 12 notebooks as a grid. Paginated.
- Notebook cards show icon, name, last used, number of sources. A menu for renaming and deleting. On mobile they are presented more condensed, more like a list.
- Empty fallback.
- A new notebook doesn't require a name. It gets created with a single click and is initially named "Untitled notebook". Immediate navigation.
- The notebook detail page has 2 columns: fixed sources column and chat. On mobile, they are both full width with a tab navigation.
- In the sources column, sources can be added: URLs, files, and pasted text.
- For URLs, the document title becomes the title. For files, the file name. For pasted text the first line.
- Sources cannot be edited. They can be deleted.
- Sources can be de/activated via a checkbox and searched. The checkbox sits on the right side.
- One chat thread per notebook. Can be cleared.
- Chat input has generous size and padding.
- Response can be canceled and canceled or failed responses can be retried. Retry replaces the previous response. Otherwise keep it and add next message below.
- Chat history goes into next prompt. Moving window of 10 exchanges.
- Changing sources resets context. Visualized by separator line.

Tech: TanStack Start as the React framework. Shadcn for components. Tailwind for CSS. Convex as the core data and vector database and for text search. Better Auth + Convex + TanStack for the auth topics. Resend + React Email + Convex for emails. Mastra for semantic chunking. Open AI for chat/summary type inference. Voyage for embeddings and reranking. AI SDK for the SSE bridge. Make sure you use convex-helpers with the client-side cache provider. Make sure you use zustand for any other global state, not React context and not react-query.

We'll have to clarify lots of details and edge cases. /grill-me 

---

**Cursor**

I'll run a grilling session on the Corpus/NotebookLM plan — reading the grilling skill and the challenge brief first so we stress-test the right decisions.

Starting the grill. One decision at a time — highest-leverage first.

**Q1 — Product boundary vs full NotebookLM**

NotebookLM also has Studio (Audio Overview, mind maps, flashcards, reports), sharing/collaboration, and citation-heavy grounded answers. Your list is the library + sources + single-thread chat loop. That’s a coherent MVP, but we need an explicit cut line so we don’t accidentally design for features you don’t want.

**What is explicitly out of scope for v1?**

My recommendation: ship only what you listed — auth, notebook library, sources (URL/file/paste), activate/search sources, one chat thread with cancel/retry/context window/source-change separator. **Out:** Studio/Audio Overview, sharing/invites, multi-user notebooks, mind maps/flashcards, mobile apps, and fancy citation chips in the UI (answers can still be grounded via RAG without a NotebookLM-style citation panel). Add citations later only if time remains.

Confirm, amend, or redraw that cut line.

---

**User**

Generally agree. I find citations to be quite important for this type of application. We should at least ground every paragraph with sources and show small pills that open the source in the sources panel.

---

**Cursor**

**Citation behavior**

> **When a citation pill is opened, how much source context should Corpus reveal? I recommend paragraph-level citations backed by exact chunk IDs: clicking a pill switches the Sources column to a read-only source preview, scrolls to and highlights the cited passage, and offers “Open original” for URLs/files. On mobile, it switches to the Sources tab first. If exact preview/positioning fails for a format, show the cited excerpt and source metadata rather than a misleading location.**
> - Exact passage preview and highlight (Recommended)
> - Show cited excerpt and source metadata only
> - Select the source without locating the passage
>
> Answer: A but we don't need an "Open original".

Understood: citation pills open an exact, highlighted passage in the read-only source preview; no “Open original” action.

**Q2 — Supported file types**

Which uploads must v1 support?

My recommendation: **PDF, plain text, Markdown, and DOCX**. Reject unsupported, encrypted, or extraction-empty files with a clear error. This provides credible document support while avoiding OCR, spreadsheets, presentations, audio/video, and image processing.

Should we use that scope, or include other formats?

---

**User**

We could use markitdown-ts and support all text file types it supports. WDYT?

---

**Cursor**

**Import scope**

> **`markitdown-ts` is a good normalization layer, but I would not promise every advertised format. Its image/audio handlers primarily extract metadata, ZIP adds recursion/security concerns, and conversion to Markdown may not preserve reliable page/line coordinates for exact citation highlighting. I recommend an explicit v1 allowlist—PDF, DOCX, XLSX, HTML, TXT/Markdown, CSV, XML, RSS/Atom, and IPYNB—using `markitdown-ts` behind our own adapter. Reject images, audio, ZIP, and PowerPoint. For citations, store stable offsets into the normalized Markdown and highlight that normalized preview rather than claiming fidelity to the original document. Which policy should the plan use?**
> - Explicit content-rich allowlist (Recommended) ✔
> - Accept every format markitdown-ts handles
> - Limit to PDF, DOCX, HTML, TXT, and Markdown

**URL ingestion**

> **What should “URL source” mean in v1? I recommend public HTTP(S) web pages only: follow limited redirects, block private/local addresses to prevent SSRF, enforce response size/time limits, extract readable HTML, and reject login walls, unsupported MIME types, and pages with no useful text. JavaScript-heavy pages may fail. YouTube transcripts and crawling linked pages would be separate source types and stay out of scope.**
> - Public HTML pages only (Recommended)
> - Public HTML plus YouTube transcripts
> - Attempt any URL markitdown-ts accepts
>
> Answer: public html only. no js execution. basic heuristics for extracting main content with body fallback. convert to markdown.

**Account lifecycle**

> **How complete should email/password auth be? I recommend sign-up, sign-in, sign-out, mandatory email verification, resend-verification, forgot/reset-password, and Google OAuth. Google addresses count as verified. Sessions persist across browser restarts; account linking is allowed only when Better Auth can safely verify the same email. Account deletion, profile editing, and multi-factor auth stay out of scope.**
> - Complete basic lifecycle (Recommended) ✔
> - Skip email verification
> - Only sign-up, sign-in, and sign-out

**Source limits**

> **We need hard ingestion limits for cost, latency, and abuse control. I recommend 20 sources per notebook; 20 MB per uploaded file; 2 MB fetched per URL; 200,000 characters for pasted text; and 500,000 extracted characters per source. Reject before processing where possible and show the exact limit in the error. This is enough for a convincing challenge submission without exposing unbounded embedding costs.**
> - Use these conservative limits (Recommended) ✔
> - Allow 50 sources with larger documents
> - Limit to 10 sources and 10 MB files

**Ingestion behavior**

> **Source extraction, chunking, and embedding are asynchronous. I recommend adding each source immediately with a processing state; it becomes checked/active automatically only after indexing succeeds. Processing sources cannot be selected for chat. Failed sources remain visible with the error plus Retry and Delete actions, and do not count as active context. Multiple additions process independently.**
> - Visible processing and failure states (Recommended)
> - Keep the add dialog open until processing finishes
> - Show processing, but remove failed sources automatically
>
> Answer: Visible processing and failure states (realtime through convex. Since we're not crawling, only scraping individual sites, we don't need a discovery queue or elaborate workflow system. Just write intermediate processing states to convex for UI feedback. Allow selecting pending sources. Select any new sources by default. If the users sends a message, just exclude incomplete sources. Reset context with the previously stated separator when sources change. If a source becomes while a response streams, the separator is added after the complete response and the completed source is available for the next turn.

**Context boundary**

> **Let’s pin down “changing sources resets context.” I recommend keeping all chat messages visible, but excluding every exchange before the latest source-change separator from future prompts. A boundary is created when the effective ready-and-selected source set changes: checking/unchecking or deleting a ready source, or a selected pending source becoming ready. If a response is streaming, defer and coalesce all such changes into one separator after that response. The 10-exchange window then applies only after the newest separator. Is that the intended behavior?**
> - Yes, start a new prompt-history epoch (Recommended) ✔
> - Show separator but retain earlier exchanges in prompts
> - Delete earlier chat messages when sources change

**Retrieval strategy**

> **For each chat turn, I recommend hybrid retrieval over only ready, selected sources: search Convex vector and full-text indexes in parallel, merge/deduplicate candidates, rerank with Voyage, and pass the best chunks within a fixed token budget to OpenAI. The model must cite chunk IDs in every substantive paragraph; the server validates them and retries once if citation structure is invalid. This is more grounded than vector-only retrieval, while still using Convex for both search modes as requested.**
> - Hybrid retrieval plus reranking (Recommended) ✔
> - Vector search plus reranking only
> - Retrieve broadly and let OpenAI select evidence

**Grounding policy**

> **Should chat answer strictly from selected sources? I recommend yes: disable Send when there are zero ready-and-selected sources, ignore pending sources when at least one ready source exists, and require the model to say that the available sources do not support an answer rather than use outside knowledge. Factual paragraphs require citation pills; brief conversational or insufficiency statements may have none.**
> - Strictly source-grounded (Recommended) ✔
> - Use general model knowledge when sources are insufficient
> - Allow general chat only when no sources are ready

**Retry semantics**

> **A historical retry can invalidate every later exchange. I recommend allowing Retry only while the canceled/failed response is the latest exchange. It reuses that exchange’s user prompt and current source set, replaces the partial/error assistant record in place, and does not append another user message. If the user sends a new message instead, the older response remains visible but is no longer retryable. Only one response may stream per notebook.**
> - Retry latest failed/canceled response only (Recommended) ✔
> - Retry any failed response and delete all later exchanges
> - Retry historical responses without changing later exchanges

**Notebook pagination**

> **How should the 12-card overview paginate? I recommend cursor-based Previous/Next navigation, sorted by `lastUsedAt` descending, because it maps cleanly to Convex and remains stable as notebooks change. Search is server-side title search, debounced, and resets pagination. Opening a notebook updates `lastUsedAt`; source/chat activity does too. The cursor is kept in the URL so Back restores the result page. No total-page count is shown.**
> - Cursor-based Previous/Next (Recommended) ✔
> - Numbered pages with a total count
> - Replace pagination with Load more

**Notebook deletion**

> **Notebook deletion cascades through messages, source records, chunks, embeddings, and stored uploads, so it should not be a silent menu click. I recommend a confirmation dialog naming the notebook, immediate removal from the library after confirmation, cancellation of any active response, and background cleanup of associated storage. No trash or undo in v1. Rename uses a small dialog, trims whitespace, permits duplicate names, and maps an empty result back to “Untitled notebook.”**
> - Confirmed permanent deletion (Recommended) ✔
> - Immediate deletion with a short Undo window
> - Trash with later permanent deletion

**Source search**

> **What should the Sources-column search box match? I recommend filtering source titles only, case-insensitively, while preserving each source’s checkbox state. Content search belongs to chat retrieval and citation preview, not this compact list; matching full document text here would be surprising without snippets. With the 20-source cap, this can be immediate client-side filtering of the realtime Convex result.**
> - Filter source titles only (Recommended) ✔
> - Search titles and extracted content
> - Filter titles and source type

**Source titles**

> **For deterministic source titles, I recommend: URL uses a cleaned HTML `<title>`, falling back to hostname plus path; file uses the original filename including extension; pasted text uses the first non-empty line, falling back to “Pasted text.” Normalize whitespace and truncate display titles to 100 characters while retaining the complete original metadata internally. Duplicate titles are allowed because sources cannot be renamed. Agree?**
> - Use these fallbacks (Recommended) ✔
> - Use the literal first line, even when blank
> - Automatically suffix duplicate titles

**Deleted citations**

> **Deleting a source can leave old answers citing it. I recommend true deletion: confirm the action, purge its upload, normalized text, chunks, and embeddings, then leave historical answers intact with disabled citation pills labeled “Source deleted.” Retaining citation excerpts would make “delete source” misleading because source content would still be stored. Deletion also creates the source-context boundary we defined.**
> - Purge source and disable old pills (Recommended)
> - Retain cited excerpts for historical answers
> - Also delete all answers that cited the source
>
> Answer: We could have a excerpt that we create a copy of at inference time and use it in a popover on the pills/footnotes. That way, citations can survive. If the thread gets cleared, they die with the message. If the source gets deleted, it can no longer be opened from the citation pill but the pill preserves meaning. WDYT?

**Citation snapshots**

> **That is a sound design. Store only the exact cited excerpt plus source title and locator as message-owned citation data at inference time—not whole chunks. Every pill can show that snapshot in a hover/focus/tap popover; while the source exists, clicking also opens its highlighted preview. After source deletion, the popover survives but panel navigation is unavailable. The important caveat is disclosure: deleting a source does not erase excerpts already copied into chat history; clearing chat or deleting the notebook does. Should the source-deletion confirmation state this explicitly?**
> - Keep snapshots and disclose retention (Recommended) ✔
> - Keep snapshots without extra deletion copy
> - Remove snapshots when deleting the source

**Clear chat**

> **I recommend Clear chat require confirmation, cancel any active response, and permanently delete all messages plus their citation snapshots for that notebook. Sources and their selected states remain unchanged, and no context separator is needed because the new thread starts empty. The empty chat returns to starter prompts based on selected ready sources.**
> - Confirmed permanent clear (Recommended) ✔
> - Clear with a short Undo window
> - Archive the old thread internally

**OpenAI responsibilities**

> **You wrote “Open AI for chat/summary type inference.” What does “summary type inference” mean here? My best interpretation is that OpenAI handles grounded chat generation and creates a concise notebook/source summary (possibly also suggested prompts), while source titles remain deterministic from the ingestion rules. I do not want to invent an extra classification feature.**
> - Chat generation plus notebook/source summaries (Recommended)
> - Chat, summaries, and AI-generated notebook titles
> - Only grounded chat; no summary inference
>
> Answer: Chat generation + Generates notebook title from first source if title is empty.

**Automatic notebook title**

> **I recommend treating “Untitled notebook” as an auto-title-eligible placeholder, not a literal user title. When the first source finishes extraction, OpenAI generates a short notebook title once. Apply it only if the user has not renamed the notebook in the meantime; never regenerate it when sources change or are deleted. On failure, keep “Untitled notebook.” The library updates in realtime. Is that the intended policy?**
> - Generate once from the first completed source (Recommended) ✔
> - Do not replace “Untitled notebook” automatically
> - Regenerate whenever sources change until user renames

**History window**

> **For the moving 10-exchange window, I recommend including only the ten most recent successful user–assistant pairs after the latest source boundary, plus the new user message. Failed and canceled exchanges remain visible but are excluded from future model context; context separators and system events never count. We do not summarize older exchanges in v1.**
> - Last 10 successful pairs only (Recommended) ✔
> - Count failed and canceled attempts too
> - Keep 10 pairs plus an AI summary of older chat

**Mobile tabs**

> **On mobile, I recommend a sticky two-tab bar for Sources and Chat. A brand-new notebook opens on Sources so the first action is obvious; notebooks with at least one source open on Chat. The active tab is URL-backed for refresh/Back behavior. Tapping a citation switches to Sources and opens the highlighted preview; closing the preview returns to the source list, while the user switches back to Chat via the tab.**
> - Adaptive default with URL-backed tabs (Recommended) ✔
> - Always open on Chat
> - Persist the last selected tab per notebook

**Source preview**

> **Beyond citation pills, should users be able to open a source directly from the source list? I recommend yes: clicking the title replaces the list with a read-only normalized-Markdown preview starting at the top; a Back control restores the list. The right-side checkbox toggles activation without opening it. Citation navigation uses the same preview but scrolls to the saved locator and highlights the excerpt. No in-document search in v1.**
> - Allow direct source preview (Recommended) ✔
> - Preview sources only through citations
> - Open previews in a separate overlay drawer

---

**User**

- Notebook title is inline editable on the detail page without layout change or text position change.
- Files can be dragged to the sources sidebar to be added.
- "Rename source" modal immediately focuses the name input.
- Add source opens a modal. It has an input field for a URL that is focused immediately. Files can be dropped to an area. When dropped, the files are added as sources and the modal closes. The modal contains a button to add a text source. It changes the modal to a textarea that is focused immediately.
- Modals and menus close with ESC and by clicking outside. Modals open and close with a soft but swift animation.

---

**Cursor**

**Source rename scope**

> **This changes the earlier “sources cannot be edited” rule. I recommend interpreting that rule as: extracted source content is immutable, but its display name is editable through Rename source. The modal pre-fills and immediately selects/focuses the current name; saving trims whitespace, requires 1–100 characters, and allows duplicates. Is that the intended distinction?**
> - Rename metadata; content remains immutable (Recommended) ✔
> - Keep source names immutable
> - Allow both source names and content to be edited

**Dropped files**

> **When users drop files into the modal or Sources sidebar, should one drop accept multiple files? I recommend yes: validate the whole batch against type, per-file size, and remaining source quota; enqueue every valid file independently; show a concise error for rejected files; then close the modal after a modal drop. A sidebar drop has no modal to close.**
> - Accept valid files and report rejected ones (Recommended) ✔
> - Reject the whole batch if any file is invalid
> - Accept only one file per drop

**Inline notebook title**

> **For layout-stable inline editing, I recommend rendering the notebook title in a fixed-size text field that looks like plain text until hover/focus. Click focuses and selects the title; Enter or blur saves, Escape restores the prior value, and an empty saved value becomes “Untitled notebook.” A pending auto-title must never overwrite a title once the user begins editing. No separate rename modal on the detail page; the overview card menu can still use one.**
> - Click-to-edit with Enter/blur save (Recommended) ✔
> - Require a pencil button to enter edit mode
> - Always present the title as a visible input

**Theme behavior**

> **What should the top-right theme switcher offer? I recommend Light, Dark, and System in a small menu. Persist the preference locally with Zustand (not React context), apply it before hydration to avoid a flash, and update live when the OS theme changes in System mode. Theme preference need not sync to the user account in v1.**
> - Light, Dark, and System locally (Recommended) ✔
> - Simple light/dark toggle
> - Light, Dark, and System synced to account

**Unauthenticated entry**

> **Should Corpus have a public marketing page? I recommend no: unauthenticated users arriving at `/` see a focused branded sign-in screen with Google and email/password, links to sign up and reset password, and verified-email states. Authenticated users go directly to the notebook library. This keeps the challenge centered on the product rather than a landing page.**
> - Direct branded authentication flow (Recommended) ✔
> - Add a public marketing landing page
> - Use one card toggling sign-in/sign-up in place

**Bulk source selection**

> **With up to 20 sources, should the Sources header include a master checkbox? I recommend yes. It selects or deselects all sources, including pending ones. When title search is active, it affects only visible matches so users can intentionally compose a subset; an indeterminate state reflects mixed selection. Processing and failed rows remain distinguishable, and failed sources cannot be selected.**
> - Master checkbox affects visible matches (Recommended) ✔
> - Master checkbox always affects every source
> - Only individual source checkboxes

**Chat composer**

> **I recommend a generously padded autosizing textarea (about 4–10 lines) with a 4,000-character limit and live remaining count near the limit. Enter sends, Shift+Enter inserts a newline, and the primary action changes from Send to Stop while streaming. Disable Send for empty input or zero ready-selected sources, but preserve typed text while sources process. On touch devices, the explicit Send button remains prominent.**
> - Enter sends; Shift+Enter adds newline (Recommended) ✔
> - Enter adds newline; Cmd/Ctrl+Enter sends
> - Only the Send button submits

**Stopped responses**

> **When Stop is pressed or streaming fails after some text arrived, I recommend retaining the partial response in place, marking it Canceled or Failed, and showing Retry beneath it. A failure before any text shows a compact error card in the assistant slot. Neither attempt enters future chat context unless retry succeeds.**
> - Retain partial text with status (Recommended) ✔
> - Discard partial text and show only status
> - Retain partial text and include it in later context

**Deployment target**

> **Where should the live challenge deployment run? I recommend Vercel for the TanStack Start web/SSE layer, with Convex as the managed backend/storage/vector database and Resend for transactional email. This gives straightforward preview/production URLs for Google OAuth callbacks. We should design ingestion actions around serverless time limits rather than rely on a long-running worker.**
> - Vercel plus hosted Convex (Recommended) ✔
> - Cloudflare plus hosted Convex
> - Containerized/self-hosted web app plus Convex

**Abuse limits**

> **A public AI demo needs account-level guardrails beyond per-source limits. I recommend at most 100 notebooks per account, 50 source ingestions per day, 100 chat generations per day, and one active generation per notebook. Return clear retry/reset messaging and enforce limits server-side before paid API calls. These are product safeguards, not billing or a usage dashboard.**
> - Use these server-enforced quotas (Recommended) ✔
> - Use stricter demo quotas
> - Only enforce notebook/source size limits

**Voyage models**

> **Voyage’s current general-purpose choices include `voyage-4-large` embeddings and `rerank-2.5`. Given the modest quotas and the importance of citations, I recommend using both quality-tier models with 1,024-dimensional float embeddings in Convex. Keep model names centralized in configuration so a later cost pass can switch to `voyage-4-lite`/`rerank-2.5-lite`, but the implementation plan should target quality first.**
> - voyage-4-large plus rerank-2.5 (Recommended) ✔
> - voyage-4 plus rerank-2.5-lite
> - voyage-4-lite plus rerank-2.5-lite

**OpenAI models**

> **For current OpenAI models, I recommend `gpt-5.6-terra` for grounded chat because it is the quality/cost balance tier, and `gpt-5.4-nano` for the one-shot notebook title because that task is simple. Centralize both aliases in server configuration and cap answer length. This avoids paying flagship rates for a public challenge while keeping chat quality credible.**
> - GPT-5.6 Terra for chat; GPT-5.4 nano for titles (Recommended)
> - GPT-5.6 Sol for chat; GPT-5.4 mini for titles
> - GPT-5.6 Luna for chat; GPT-5.4 nano for titles
>
> Answer: Could gpt-5.4-mini suffice?

**OpenAI model choice**

> **Yes. `gpt-5.4-mini` should be sufficient for grounded RAG: retrieval and citation enforcement matter more here than frontier-level reasoning, and Mini is faster and substantially cheaper while supporting streaming and structured outputs. I would use it for chat and `gpt-5.4-nano` for title generation. Which should the plan lock in?**
> - GPT-5.4 mini for chat; nano for titles (Recommended) ✔
> - GPT-5.4 mini for both tasks
> - GPT-5.6 Terra for chat; nano for titles

**Source counts**

> **What should the notebook card’s source count and the 20-source limit include? I recommend counting every non-deleted source record, including pending and failed rows, because that matches what users see in the Sources panel and prevents abandoned failures from accumulating without bound. Deleting a failed source frees a slot. Active chat context still includes only ready-selected sources.**
> - Count all visible source records (Recommended) ✔
> - Exclude failed sources from counts and quota
> - Count only successfully indexed sources

**Interface language**

> **What language should the shipped UI use? I recommend English-only product copy for the challenge, with locale-aware relative dates and accessible labels. We should structure copy cleanly but not add an i18n framework in v1.**
> - English only (Recommended) ✔
> - German only
> - English and German localization

**Visual direction**

> **Should Corpus visually imitate NotebookLM or establish its own identity? I recommend a distinct, restrained research-workspace identity: cool neutral surfaces, an ink-blue accent, crisp workhorse sans typography, fine ruled dividers, and subtle library-index cues in icons and empty states. Keep familiar NotebookLM information architecture, but avoid copying Google’s palette or visual chrome. Motion stays brief and functional, including the modal transitions you specified.**
> - Distinct restrained research workspace (Recommended) ✔
> - Closely mirror NotebookLM’s visual language
> - Use mostly stock shadcn styling

**Delivery bar**

> **What delivery constraint should govern the plan? This specification is now a production-shaped MVP, not a small weekend mockup. I recommend planning it as a polished interview submission with real external services, robust happy paths and key failures, focused automated tests, and no administrative/billing/collaboration features—but without pretending it is production-complete compliance infrastructure.**
> - Polished interview MVP (Recommended) ✔
> - Production foundation with deeper operational hardening
> - Time-boxed prototype with reduced edge-case coverage

**Source ordering**

> **How should the Sources list be ordered? I recommend newest first so newly dropped files and their realtime processing states remain immediately visible. Keep that order stable as statuses and names change; search only filters it. We should not add user-defined sorting or drag reordering in v1.**
> - Newest sources first (Recommended)
> - Original addition order
> - Alphabetical by source title
>
> Answer: Newest first. Matches NLM.

**Renamed citation labels**

> **When a source is renamed after an answer cited it, I recommend showing the current source name while the source still exists, because the pill still navigates to that live source. The citation snapshot also stores the name at generation time; if the source is later deleted, the popover falls back to that historical name and excerpt. This avoids rewriting old messages while keeping live navigation intuitive.**
> - Current name while live; snapshot after deletion (Recommended) ✔
> - Always show the name captured at generation
> - Update all historical citation snapshots on rename

**Navigation during streaming**

> **What should happen if the user refreshes, navigates away, or closes the tab during a response? I recommend treating the SSE disconnect like Stop: abort the provider request where possible, persist the received partial text as Canceled, and make it retryable when the user returns. Resumable/background streams would require substantially more orchestration and are not warranted for this challenge.**
> - Disconnect cancels and preserves partial text (Recommended) ✔
> - Continue generation in the background
> - Cancel and discard partial text

**Convex data loading**

> **The official TanStack Start + Convex Better Auth guide demonstrates SSR data loading through TanStack Query, which conflicts with your explicit “no react-query” rule. I recommend using the same official auth proxy and `ConvexBetterAuthProvider`, but constructing a direct `ConvexReactClient`, nesting `ConvexQueryCacheProvider`, and using its cached Convex hooks for application data. TanStack loaders only enforce auth/route ownership; the protected app shell SSRs, then notebook/source/chat data becomes realtime client-side. This preserves your architecture without maintaining a parallel query cache.**
> - Direct Convex hooks; no React Query (Recommended) ✔
> - Allow TanStack Query only for official SSR integration
> - Manually fetch and hydrate Convex data without a query library

**Shared understanding**

> **I think the decision tree is resolved enough to produce a concrete implementation plan: a polished English-language interview MVP; strict source-grounded chat with paragraph citations and durable excerpt snapshots; immutable normalized source content but renameable metadata; realtime asynchronous ingestion; hybrid Convex retrieval plus Voyage reranking; direct cached Convex hooks without React Query; complete basic auth; responsive research-workspace UI; and the limits, failure states, context epochs, retry rules, and deployment target we chose. Should I now consolidate this into the implementation plan?**
> - Yes, create the plan (Recommended)
> - Continue grilling edge cases first

---

**User**

I'd like to go a bit more into design, layout, and polish. I want the app to feel warm, maybe a pine primary. Subtle, soft but swift animations. Fade-in fade-out modals and menus. Autofocus. Just overall courteous and practical UX.

---

**Cursor**

That replaces the earlier cool ink-blue direction.

**Design direction:** a contemporary reading room—warm mineral backgrounds, deep pine primary, charcoal text, muted moss accents, crisp sans typography, fine dividers, and restrained shadows. Warm without becoming sepia, rustic, or “bookshop-themed.” Dark mode uses forest-charcoal rather than pure black.

Should surfaces feel mostly:

1. **Flat and editorial** — borders, spacing, minimal shadow. Recommended.
2. **Soft and tactile** — lightly elevated cards and more rounded surfaces.
3. **Dense and utilitarian** — compact library-catalog character.

---

**User**

2 and use /design-taste-frontend 

---

**Cursor**

Reading this as: a polished research workspace for knowledge workers, with a warm, courteous, tactile language, leaning toward a customized pine-themed shadcn system rather than stock NotebookLM chrome.

Design dials: `DESIGN_VARIANCE 4`, `MOTION_INTENSITY 4`, `VISUAL_DENSITY 5`. Familiar and practical, with enough softness and motion to feel considered.

**Notebook workspace layout**

> **For the desktop notebook page, I recommend a full-height split workspace: a fixed 22rem Sources pane with a subtly tinted surface and soft right edge, plus a flexible Chat canvas whose conversation is centered at roughly 48rem. The split itself stays edge-to-edge, while inputs, previews, and menus provide the tactile elevation. This avoids putting the entire app inside nested cards. Which framing should we use?**
> - Full-height split workspace (Recommended)
> - Two elevated panels inside a padded page
> - Narrower source pane with a wider, denser chat
>
> Answer: full height split, make it 25rem and 50rem

**Notebook card rhythm**

> **For the library, I recommend spacious tactile cards in a responsive 4-column grid at wide desktop, 3 columns at laptop, 2 at tablet, then condensed full-width rows below 640px. Each card uses a quiet warm surface, 1px pine-tinted border, 14px radius, a small book tile, title, metadata, and a low-contrast menu button. Hover lifts only 2px with a tinted shadow; pressing settles it back.**
> - Responsive 4/3/2 grid, then mobile rows (Recommended) ✔
> - Maximum 3 columns with larger cards
> - Four columns from laptop sizes upward

**Pine palette**

> **I recommend a green-mineral palette rather than beige paper: light background `#F1F3EE`, raised surface `#FAFBF8`, pine `#245844`, dark text `#1E2823`, muted text `#68736C`, and border `#D8DED7`. Dark mode becomes forest-charcoal (`#141A17` / `#1B231F`) with a lighter pine (`#79B999`). Pine remains the sole decorative accent; red, amber, and green appear only for semantic error/warning/success states.**
> - Green-mineral neutrals (Recommended)
> - Warmer cream and paper neutrals
> - Cleaner gray-white neutrals with pine accents
>
> Answer: Could you generate an HTML file that showcases each of the color palettes?

Created [docs/color-palettes.html](/home/n4bb12/git/work/interviews/corpus/docs/color-palettes.html). It compares all three palettes in the same Sources and Chat layout, with an interactive light/dark preview.

---

**User**

Could you add more variants? I currently like warm paper most but I'd like a more earthy version.

---

**Cursor**

Updated [docs/color-palettes.html](/home/n4bb12/git/work/interviews/corpus/docs/color-palettes.html) with three warmer branches:

- Earthy paper: clay-tinted, closest to Warm paper
- Moss and linen: softer olive character
- Walnut and pine: richer brown-mineral depth

All six support the light/dark preview toggle.

**Palette direction**

> **Which palette should anchor the rest of the layout and motion decisions?**
> - Earthy paper (Recommended)
> - Warm paper
> - Moss and linen
> - Walnut and pine

---

**User**

Go with green mineral. Next, explore fonts and icons. Close to send should be the number of active sources. Notebooks should be sorted in order of last used, most recent first.

---

**Cursor**

Locked in:

- Green mineral palette
- Notebooks sorted by `lastUsedAt` descending
- Active-source count positioned beside Send in the composer
- The selected 25rem Sources pane and 50rem Chat measure

For typography, I’d avoid a serif pairing and use one variable sans throughout. It will keep the research workspace practical while weight, size, and color provide hierarchy.

---

**User**

Yea, again, can I see them? Separate file.

---

**Cursor**

Created [docs/type-and-icons.html](/home/n4bb12/git/work/interviews/corpus/docs/type-and-icons.html). It compares:

- Figtree, Geist, and Manrope using the same notebook/chat content
- Phosphor, Tabler, and Radix across the actual Corpus action set
- Light and dark Green mineral themes
- The active-source count immediately beside Send

The final app will self-host the selected variable font and install one icon family rather than using the showcase CDNs.

**Choose the typeface**

> **After viewing the comparison, which font should Corpus use?**
> - Figtree (Recommended) ✔
> - Geist
> - Manrope

**Choose the icons**

> **Which icon family should Corpus use consistently? Phosphor’s slightly softer geometry best matches Figtree and the tactile Green mineral system.**
> - Phosphor regular (Recommended) ✔
> - Tabler
> - Radix

**Active-source count**

> **I recommend rendering the count as a quiet compact button immediately left of Send: a Phosphor stack icon plus “3 sources,” with an accessible label of “3 active sources.” Clicking it focuses the Sources pane on desktop and switches to the Sources tab on mobile, making the status useful without adding another menu. Should it behave this way?**
> - Count navigates to Sources (Recommended)
> - Count is non-interactive text
> - Count opens a small active-source popover

---

**User**

A but by navigate what do you mean on desktop? Focus the source search perhaps?

---

**Cursor**

On desktop, I would not focus the search input. That unexpectedly opens text-entry mode.

Instead, clicking the count should:

- Return from source preview to the source list if necessary
- Scroll the pane to the selected sources
- Move accessible focus to the Sources heading
- Briefly highlight active rows/checkboxes

On mobile, it switches to the Sources tab. This makes the action predictable without opening a popover.

---

**User**

👍

---

**Cursor**

**Header branding**

> **For the persistent 4rem header, I recommend the Phosphor Books icon in pine inside a softly raised 2rem square, followed by “Corpus” in Figtree 700. The whole lockup links to the notebook library. A fine bottom border separates it from content; theme and account controls use quiet icon buttons on the right. Which treatment should we lock in?**
> - Soft raised icon tile (Recommended) ✔
> - Bare pine icon with no container
> - Solid pine tile with light icon

**Motion language**

> **I recommend a restrained motion system: 120ms for press/hover feedback, 150ms for menus and tooltips, and 180ms for dialogs, tabs, and panel changes, using an ease-out curve close to `[0.16, 1, 0.3, 1]`. Menus fade and move 4px; dialogs fade and scale from 98.5%; cards lift 2px; realtime content crossfades without sliding. Reduced-motion mode removes transforms and keeps only near-instant opacity changes.**
> - Use this soft, swift motion system (Recommended) ✔
> - Use fewer transforms and mostly opacity
> - Use more spring and shared-layout motion

**Library controls**

> **For the overview, I recommend a max-width 84rem content area beneath the shared header. “Your notebooks” sits left, the pine “New notebook” button sits right, and a 20rem search field sits directly below the heading before the responsive card grid. Search results update after a short debounce; pagination remains at the bottom. On mobile, the button stays beside the heading when it fits and the search becomes full width.**
> - Heading row, then search (Recommended) ✔
> - Search and New notebook in one toolbar row
> - Put notebook search in the global header

**Notebook cards**

> **I recommend one consistent Phosphor Notebook icon in a pine-tinted tile rather than generated covers or random colors. The full card opens the notebook; its menu button is independently keyboard accessible. Title uses two lines at most, followed by “Used 18 minutes ago” and “8 sources” with tabular numerals. Pending and failed sources still contribute to that count, as previously decided.**
> - Consistent notebook icon and pine treatment (Recommended) ✔
> - Vary muted icon-tile colors by notebook ID
> - Use notebook-title initials instead of an icon

**Library empty states**

> **I recommend two distinct courteous states. A new library shows a softly raised Books icon, “Create your first notebook,” one practical sentence, and a pine “New notebook” button. A search with no matches stays compact and says “No notebooks match ‘…’” with a Clear search action, never another create prompt. Skeleton cards preserve the final grid while loading.**
> - Use distinct first-run and no-results states (Recommended) ✔
> - Reuse one empty state for both cases
> - Use plain text and a button without illustration

**Detail header**

> **On desktop, I recommend aligning the header to the 25rem/Chat split: the left header cell contains the Corpus lockup; the right cell contains the inline-editable notebook title followed by theme and account controls. This keeps the title stable and avoids a duplicate chat header. On mobile, the global header keeps brand/actions, then a compact title row and Sources/Chat tabs sit below it.**
> - Align header to workspace split (Recommended) ✔
> - Center the notebook title in the global header
> - Place the title inside the Chat pane

**Source rows**

> **For each source row, I recommend a type icon and two-line title/status block on the left; a low-contrast menu button and the required checkbox on the right. The menu appears on hover but remains in the tab order and visible on touch devices. Clicking the row body opens the preview, clicking the checkbox only changes activation, and menu actions never trigger row navigation.**
> - Menu followed by rightmost checkbox (Recommended) ✔
> - Keep menu and checkbox always visible everywhere
> - Hide the menu and use right-click/long-press actions

**Sources controls**

> **I recommend this order in the 25rem pane: “Sources” plus pine “Add” button, full-width search, then a compact “Select all” row with the selected/total count before the scrollable source list. Dragging files anywhere over the pane reveals one inset drop surface without shifting layout. Search filters titles, and Select all affects only visible results as decided.**
> - Heading, search, Select all, list (Recommended) ✔
> - Search at the very top of the pane
> - Put Select all beside the heading

**Source preview polish**

> **When a source opens, I recommend replacing the list with a pane-local preview: a Back control, source title and menu in a compact sticky header, then normalized Markdown in the same scroll area. Citation navigation scrolls the exact passage into the upper third and marks it with a soft pine wash plus a 3px pine edge that fades to a persistent pale highlight. This communicates location without flashing.**
> - Pane-local preview with soft passage highlight (Recommended) ✔
> - Keep search/add controls visible above the preview
> - Slide a preview layer over the Sources pane

**Chat presentation**

> **For chat, I recommend assistant answers as unboxed readable text, while user messages use compact right-aligned raised bubbles. The 50rem conversation column has generous vertical rhythm; citations sit directly after paragraphs. The composer remains sticky at the bottom with a subtle background fade, 1rem padding, a four-line starting height, active-source count, and Send/Stop on its lower right.**
> - Unboxed assistant text, user bubbles (Recommended) ✔
> - Use bubbles for both user and assistant messages
> - Use flat document-style blocks for both roles

**Citation interaction**

> **I recommend compact numbered pine pills. On desktop, hover or keyboard focus shows the saved excerpt popover after a short delay, and click opens the highlighted source. On mobile, tapping a live citation switches directly to Sources; deleted-source citations instead open the surviving excerpt popover. Adjacent citations remain separate buttons with comfortable hidden hit areas.**
> - Desktop preview plus click; direct mobile navigation (Recommended) ✔
> - Always open a popover first, then offer View source
> - Open Sources directly on every live citation

**Authentication layout**

> **For authentication, I recommend a focused 28rem raised panel on the Green mineral background, with the Corpus lockup above it. Google appears first as a full-width secondary button, followed by a quiet divider and labeled email/password fields. Sign-in, sign-up, verification, and reset states reuse the same footprint so transitions do not jump. No decorative split-screen artwork or marketing copy.**
> - Focused centered auth panel (Recommended) ✔
> - Form beside a branded visual panel
> - Form directly on the page without a card

**Loading feedback**

> **I recommend shape-matched skeletons only for initial route loads. Realtime source ingestion uses the real row immediately with a small rotating Phosphor CircleNotch and plain status text such as “Extracting” or “Embedding,” never fake percentages. Chat streaming uses a quiet pulsing cursor; buttons retain their width while labels change. Completed content crossfades in place without celebratory motion.**
> - Contextual skeleton and status feedback (Recommended)
> - Use spinners for most waiting states
> - Use text-only loading states
>
> Answer: No separate skeleton layouts. Use placeholder dummy data on real components with a loading state that makes text invisible and adds a light rounded background, shimmer, or the like. As in how a skeleton would look like but with the real layout, font sizes, etc.

Understood. Loading uses the production components themselves, not parallel skeleton components:

- Placeholder records preserve the exact final typography and geometry.
- Text becomes transparent and receives soft rounded fills.
- A restrained pine-tinted shimmer runs only while loading.
- Placeholder content is hidden from assistive technology, with one live “Loading” status.
- Reduced-motion mode uses static fills.
- Realtime records replace placeholders in place, preventing layout shift.

**Error feedback**

> **For courteous failures, I recommend keeping actionable errors where they occurred: field errors under inputs, ingestion errors inside the source row, and failed/canceled state beneath the assistant response. Toasts are reserved for brief confirmations or failures with no stable home, such as “Notebook deleted” or a network disconnect. Destructive confirmations name the affected notebook/source and describe retained citation excerpts where relevant.**
> - Contextual errors with restrained toasts (Recommended) ✔
> - Use toasts for most operation results
> - Avoid toasts entirely

**Header actions**

> **I recommend two separate quiet controls in the top right: a theme icon button opening Light/Dark/System, then a 2rem circular account button using the Google profile image or initials fallback. The account menu shows name/email and Sign out only. Both menus share the 150ms fade-and-rise motion, close on Escape/outside click, and restore focus to their trigger.**
> - Separate theme and account controls (Recommended) ✔
> - Place theme options inside the account menu
> - Use the user name instead of an avatar button

**Add source dialog**

> **I recommend a 32rem dialog with the URL field and Add button first, a quiet “or” divider, a generous file-drop surface, then an “Add pasted text” secondary action. URL input receives initial focus. Switching to text crossfades the body in the same dialog footprint and focuses a 10rem textarea; Back restores the initial view. Successful URL/text submit or any valid file drop closes the dialog immediately.**
> - Stacked URL, files, then text action (Recommended) ✔
> - Use URL, Files, and Text tabs
> - Start with three source-type choice cards

**Empty chat**

> **When ready sources are selected but chat is empty, I recommend a quiet left-aligned introduction inside the 50rem column: “Ask your sources” plus one sentence and three compact prompt rows such as “Summarize the main ideas.” They look like clickable list items, not equal feature cards. With no ready-selected sources, replace prompts with a direct instruction and a button that moves to Sources.**
> - Left-aligned intro with prompt rows (Recommended) ✔
> - Use wrapping suggestion pills above the composer
> - Show only instructional placeholder text

**Source-change separator**

> **I recommend a quiet full-width divider between exchanges labeled “Sources changed” with “3 active” beneath it in smaller text. No timestamp or detailed diff. It appears only when earlier successful chat context exists, and repeated source changes coalesce into one trailing separator until another message is sent.**
> - Labeled divider with active count (Recommended) ✔
> - List which sources were added or removed
> - Use only a line and tooltip

**Mobile tabs**

> **For mobile Sources/Chat navigation, I recommend a compact two-option segmented control beneath the notebook title. It stays sticky below the global header; the selected tab uses a raised surface with pine text rather than a heavy filled button. The control remains stable when citation navigation switches tabs.**
> - Soft segmented control (Recommended) ✔
> - Simple underline tabs
> - Fixed bottom tab navigation

**Shape system**

> **I recommend one restrained soft-radius system: 16px for cards/dialogs/composer, 12px for inputs/drop zones/menus, 10px for buttons and icon controls, and full pills only for citations/status counts. This feels tactile without making every surface bubbly.**
> - Restrained soft radii (Recommended) ✔
> - Use 20px surfaces and pill-shaped buttons
> - Use 10-12px surfaces and 8px controls

**Product voice**

> **For courteous UX copy, I recommend concise sentence case with calm, concrete recovery guidance. Avoid playful AI language, anthropomorphism, and blame. Examples: “This source could not be indexed. Try again or delete it.” and “No ready sources are selected.” Buttons use direct verbs such as Add, Retry, Rename, Delete, and Clear chat.**
> - Calm and direct (Recommended) ✔
> - More conversational and encouraging
> - Very terse and technical

**Ready for the plan**

> **The product, architecture, edge cases, responsive behavior, and visual system now appear resolved: Green mineral, Figtree, Phosphor, tactile surfaces, restrained motion, 25rem/50rem split workspace, contextual feedback, and the detailed library/source/chat interactions above. Should I consolidate everything into the concrete implementation plan now?**
> - Create the implementation plan (Recommended) ✔
> - Continue refining design details

---

**User**

Also animate where heights or layout change. E.g. in the add sources modal or items getting added/remove from the sources list. Would also love to see some soft radial gradient noise.

---

**Cursor**

**Atmospheric texture**

> **I’ll add layout-aware Motion transitions for dialog mode changes, inline errors, list insertion/removal/reordering, source preview swaps, mobile tabs, and composer height changes. For the radial gradient noise, I recommend one fixed, pointer-free atmospheric layer on broad page backgrounds such as auth, library, and empty states: a very low-opacity pine radial wash plus fine monochrome noise. Keep reading surfaces, source previews, cards, menus, and chat text clean. Dark mode receives a subtler version, and reduced-transparency removes the noise.**
> - Texture broad backgrounds only (Recommended) ✔
> - Carry subtle texture onto cards and panels too
> - Use texture only on auth and library pages

---

**User**

write the plan to docs/2 plan.md

---

**Cursor**

Plan written to [docs/2 plan.md](docs/2%20plan.md).
