# UI fixes and adjustments
_Exported on 7/26/2026 at 04:21:04 GMT+2 from Cursor (3.13.10)_

---

**User**

Make these fixes and adjustments. Make commits for each change as you go.

- Use shadcn shimmer for the shimmer animation.
- Citation popovers should not show raw markdown.
- Citation pills should show popovers on hover, not on click and should close on click.
- Citation pills should alternate with paragraphs, not all end up at the end.
- Vercel AI SDK has a feature "smoothStream" for less chunky streaming.
- They also currently don't scroll to the section nor highlight it.
- The chat thread needs more bottom spacing to offset the input panel.
- Toggling sources is currently quite choppy. Probably causes heavy re-rendering.
- Notebooks don't yet get auto-named
- Menu items should also have pointer cursors.
- We still don't have a notebook card with a plus on the home page for adding new notebooks.
- Don't vertically move notebook cards on hover.
- White background on inputs like "Search notebooks".

---

**Cursor**

I'll work through these fixes one at a time with a commit per change. First I'm surveying the codebase for the relevant UI, citation, streaming, and notebook pieces.

Next I’ll read the citation, chat, notebook, and styling code those items touch, plus the refinement notes for expected behavior.

I have enough context to start. Checking the AI SDK transform option, then applying fixes commit by commit.

Starting with the independent UI fixes, committing each one as I go.

Next up: strip markdown from citation popovers, then the hover/click and inline pill behavior.

Updating citation pills so the popover opens on hover and closes on click.

Implementing inline citation pills that sit after their paragraphs.

Next: wire citation locators through and scroll/highlight the cited passage in the source preview.

Improving notebook auto-naming with quote cleanup and a source-title fallback when the model fails.

All 13 adjustments are in, each as its own commit:

1. **Shimmer** — chat progress uses shadcn `shimmer`
2. **Plain excerpts** — citation popovers strip markdown
3. **Hover popovers** — open on hover/focus, close on click
4. **Inline pills** — numbered markers kept in content; pills sit after paragraphs
5. **smoothStream** — word-chunked streaming via AI SDK
6. **Scroll/highlight** — locators saved on citations; preview scrolls and highlights
7. **Chat padding** — `pb-56` under the thread
8. **Source toggles** — removed layout/`AnimatePresence` churn
9. **Auto-name** — LLM title with source-title fallback
10. **Menu cursors** — `cursor-pointer` on dropdown items
11. **Plus card** — `AddNotebookCard` at the start of the library grid
12. **Card hover** — no vertical lift
13. **Inputs** — solid `bg-card` background

`bun fix`, types, and tests all pass.

---

**User**

Some inconsisencies: height not fully used. separator between 1 and 2 but not 2 and 3.

---

**Cursor**

I'll inspect the Add Source dialog layout and even out the height usage and separators.

I'll make the drop zone fill the dialog height and add a matching "or" separator before paste text.

Fixed both issues:

1. The file drop zone now expands to fill the dialog’s remaining height.
2. An `or` separator sits between files and paste text, matching the one above.

---

**User**

After creating a source, the new source is immediately in the list. Maybe the realtime update comes in too fast. Then not sure how we can solve it easily. Check if we do an optimistic update here. Coult be better not to do it here.

---

**Cursor**

I'll check whether source creation uses an optimistic update and how the list reacts when a new source lands.

There’s no optimistic update — the real Convex insert finishes while the dialog is still open, so the list updates under it. I’ll close the dialog first, then create the source.

There was no optimistic update — the real Convex insert finished while the dialog was still open, so the list updated underneath it.

The dialog now closes first, then the source is created. The list update arrives afterward via the normal subscription. On failure, the dialog reopens with the error.

---

**User**

The search should find untitled notebooks.

---

**Cursor**

I'll check how notebook search is implemented and make untitled notebooks match "Untitled" queries.

Untitled notebooks store an empty title, so full-text search can't match "Untitled". I'll include them when the query matches that display name.

Untitled notebooks are stored with an empty title, so full-text search never hit them. Queries that match “Untitled notebook” (e.g. `untitled`, `note`) now also include those empty-title notebooks.

---

**User**

Search should exclude the "New notebook" card.

---

**Cursor**

I'll hide the add-notebook card whenever a search query is active.

The “New notebook” card is now hidden whenever a search query is active.

---

**User**

Add a clear button to the search

---

**Cursor**

Adding a clear control to the library search field.

The library search field now shows an X clear button whenever it has text.

---

**User**

Limit the width of the notebook title input.

---

**Cursor**

Limiting the header notebook title so it doesn't stretch across the full width.

The header notebook title is now capped at `max-w-md` so it no longer stretches across the bar.

---

**User**

Disable add source submit buttons if inputs are empty.

---

**Cursor**

URL **Add** and **Add text** are now disabled until their fields have non-empty input.

---

**User**

PDF currently doesnt get parsed. The only content is: -- 1 of 1 --
@c:\Data\Downloads\Elternbrief_Start_Infoportal.pdf 

---

**Cursor**

I'll trace the PDF/file extraction path to see why only the page marker is coming through.

Reproducing extraction against the user's PDF to see what `pdf-parse` returns.

Confirmed: this PDF has no text layer (only the `-- 1 of 1 --` marker). I'll add a screenshot + OpenAI vision fallback for scanned PDFs, and drop the unused tesseract dependency.

Fixing a syntax break in `processSource.ts`, then adding tests.

That PDF is image-based — it has no text layer, so `pdf-parse` only returned the page marker `-- 1 of 1 --`.

Extraction now:
1. Tries the embedded text layer first
2. If that’s empty/useless, renders pages and runs OpenAI vision OCR
3. Fails with a clear error if still nothing readable

Re-add or retry the source so it goes through the new path.

---

**User**

Source cards are not fully clickable

---

**Cursor**

I'll make the whole source card open the preview, except for the menu and checkbox.

The whole source card is now the preview hit target; only the menu and checkbox stay separate.

---

**User**

Misaligned checkboxes. Also change the order: Add -> Toggle all -> Items

---

**Cursor**

I'll align the select-all checkbox with the item checkboxes and reorder to Add → Toggle all → Items.

Order is now Add → select-all → items. The select-all checkbox sits in the same column as the item checkboxes (with a spacer for the menu button).

---

**User**

Give question suggestions a slight background

---

**Cursor**

Suggestion chips now use a light `bg-muted/40` background, a bit stronger on hover.

---

**User**

Replace the small add button at the top with "N sources".

---

**Cursor**

The header Add button is now a count like `0 sources`. Adding still goes through the Add source card.

