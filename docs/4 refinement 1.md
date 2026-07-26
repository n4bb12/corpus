# Project adjustments and fixes
_Exported on 7/25/2026 at 15:01:28 GMT+2 from Cursor (3.13.10)_

---

**User**

Make these fixes and adjustments. Make commits for each change as you go.

- For fonts, use a combination of fraunces and outfit.
- Give the google sign in button a branded look.
- The sign-in page should highlight the last used sign-in method. Use a persistent zustand state.
- We currently depend on sonner but I don't see us using it. We previously planned to use in-context feedback, not notifications.
- Use bun test in favor of vitest.
- Playwright wasn't in the plan. Remove it and the global tests folder.
- Replace the current tsconfig paths with a src->src alias.
- Replace ../../convex imports with absolute imports.
- Remove the convex aliases at src/utils.
- Upgrade the biome config. "The use of the recommended field has been deprecated, and will removed in the next major version of Biome. Use preset instead.biome(deserialize)". Enable tailwind support.
- We should be able to use voyage through the AI SDK. I would prefer that so it requires less code changes to switch the provider.
- We're using lots of one-off classes like rounded-[10px]. Choose standard tailwind classes like rounded-sm. Reach for the closest match.
- Extract the inline theme script in src/routes/__root.tsx to a component. Use the storage item name constant in src/lib/theme.ts.
- React FormEvent should be SubmitEvent. Add this to the global agents file.
- Import React instead of chaining off of it. Add this to the global agents file.
- Implement pages in the src folder instead of the routes folder. Use routes only for TanStack conventions. Add this to the global agents file. (Not relevant here but add the same rule for Next.js apps.)
- src/lib/theme.ts uses a manual solution for local storage. Instead, use the persistence plugin.
- Remove unused shadcn components.
- Split AddSourceDialog, SourcesPane, ChatPane, and other large components.
- We're using both Lucide and Phosphor icons. Switch to full Lucide.
- Fix variable classnames, e.g. "The class `shadow-[var(--shadow-pine)]` can be written as `shadow-(--shadow-pine)`"
- Move convex to src/convex. This can be configured in convex.json.
- Is the reranking model name correct? rerank-2.5 or voyage-rerank-2.5?

---

**Cursor**

I'll work through these fixes one by one and commit each change. First I'll inspect the repo layout and the global agents file so the commits stay scoped and consistent.

Gathering more detail on fonts, Voyage usage, utils aliases, and the large components before starting the first commits.

Rerank model is `rerank-2.5` (correct). Starting with fonts, then working through the rest with a commit per change.

Next: branded Google button and last-used sign-in method with persisted Zustand state.

Fixing the Zustand hook to match the project pattern, then committing the Google button and last-used sign-in separately.

Splitting into two commits: branded Google button first, then last-used highlighting.

Switching to Bun's test runner and removing Playwright plus the global `tests` folder.

Next up: `src/*` alias, absolute Convex imports, and moving Convex into `src/convex`.

Moving Convex into `src/convex`, switching to absolute imports, and removing the `src/utils` re-export aliases.

Upgrading Biome and switching Voyage to the AI SDK next.

Next: standardizing Tailwind classes, extracting the theme script, and switching theme state to the persist plugin.

Zustand persist stores JSON by default — I'll use custom storage so the boot script can keep reading the raw preference string.

Updating the global AGENTS file, then fixing React imports and form events across the app.

Fixing React imports and `SubmitEvent` next, then extracting pages and switching icons.

Extracting page components into `src/pages`, then splitting the large components.

Splitting the large components into focused pieces.

All requested fixes are in, each as its own commit (or a tightly related one when items depended on each other).

**Rerank model:** `rerank-2.5` is correct — not `voyage-rerank-2.5`. That matches `@ai-sdk/voyage` and Voyage’s API.

Highlights:
- Fonts → Fraunces + Outfit  
- Branded Google button + last-used method (Zustand persist)  
- Sonner removed; upload skips are inline  
- `bun test`; Playwright and `tests/` removed (helpers colocated under `src/convex`)  
- `src/*` alias; Convex moved to `src/convex` with absolute imports; `src/utils` re-exports gone  
- Biome `preset: "recommended"` + Tailwind CSS parsing  
- Voyage via `@ai-sdk/voyage`  
- Standard radii (`rounded-sm`) and `shadow-(--shadow-pine)`  
- `ThemeScript` + Zustand persist for theme  
- Global AGENTS (+ Dorkas sync): `SubmitEvent`, named React imports, pages outside routes  
- Unused shadcn removed; Phosphor → Lucide  
- Pages in `src/pages`; large source/chat components split  

`bun types` and `bun test` both pass.

