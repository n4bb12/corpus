# Search sources adjustments
_Exported on 7/26/2026 at 04:33:29 GMT+2 from Cursor (3.13.10)_

---

**User**

Make these fixes and adjustments. Make commits for each change as you go.

- Search sources should also have a clear button. The clear button should be the same as on the home page and should have a hover background.
- The notebook got named "Elternbrief_Start_Infoportal.pdf" when the source was added but it should contain a summary, not the literal file name.
- Find components larger than 100 lines and split them into smaller files.
- Hide search sources if there are less than 6.

---

**Cursor**

I'll work through these one at a time and commit each fix. First I'm locating the search clear UI, notebook naming on source add, oversized components, and the sources search visibility logic.

Next I'll inspect the home-page clear control and how notebook titles are generated from sources.

I'll start with the search clear button, then dig into the notebook-title fallback that uses the filename.

Implementing the clear button first, then the title and search-visibility fixes.

Updating title generation so notebooks get a content summary instead of falling back to the filename.

I'll fix title extraction so short headings don't get glued onto the first sentence.

Next I'll hide the sources search when there are fewer than 6 sources, then start splitting the oversized components.

Now splitting oversized components. I'll read the largest ones and extract focused pieces.

I'll split the largest components into hooks and focused UI pieces, and leave the ones that are only barely over 100 lines alone.

SourcesPane is still too large — extracting dialogs and the list body next.

Fixing the non-null assertion, then splitting the remaining oversized pages.

Trimming the remaining oversized TSX components; hooks and shadcn UI can stay.

Fixing the type errors next.

All four changes are in, each as its own commit:

1. **Clear button** — Sources search matches the library clear control, including `hover:bg-muted`.
2. **Notebook naming** — Auto-title prefers an LLM summary; falls back to a content sentence from the source markdown, and rejects filename-like titles (e.g. `Elternbrief_Start_Infoportal.pdf`).
3. **Component splits** — Large panes/pages broken into focused components and hooks (`SourcesPane`, library, chat, notebook, sign-in).
4. **Hide search** — Sources search only shows when there are at least 6 sources.

`bun fix`, types, and tests all pass. Re-add or retry that PDF source if you want the notebook retitled with the new naming logic.

