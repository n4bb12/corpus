# Initial setup and deployment
_Exported on 7/25/2026 at 13:05:38 GMT+2 from Cursor (3.13.10)_

---

**User**

Implement @docs/2 plan.md. Build all phases and write the initial setup and deployment guide.

---

**Cursor**

I'll read the plan and related docs first, then implement all phases and write the setup/deployment guide.

This is a full MVP build. I'll work through the plan phases systematically and start with the scaffold plus design foundation.

Scaffolding the TanStack Start app with Convex and shadcn, then wiring auth to match the plan.

I'll install dependencies and set up the foundation next, then build out backend and UI in parallel.

Shadcn is ready. Next I'll add UI components and start building the core application structure.

Writing foundation docs, design tokens, and the Convex data layer next.

Next up: the Convex schema, auth wiring, and core backend modules.

Convex can't import from `src/`, so I'm moving shared helpers into `convex/lib` and re-exporting them for the client.

Fixing the titles module split and adding chat, cleanup, and retrieval next.

Fixing retrieval helpers and adding cleanup, then moving on to the frontend.

Building the frontend shell, auth, and core UI components next.

I accidentally wrote the library page into `NotebookCard.tsx`. Fixing that and adding the proper components.

Updating config, adding tests and the README, then verifying the build.

Switching email templates to HTML strings so they work in Convex without a Node runtime, then finishing the README.

Fixing type errors: correcting Convex imports, storage for pasted text, and generated API stubs.

Types and tests are green. Cleaning up gitignore, running the formatter, and verifying the build.

Corpus is implemented end-to-end from `docs/2 plan.md`. Build, types, and unit tests all pass.

### What’s in place
- **App shell**: TanStack Start + Bun, Tailwind 4, shadcn (`b6Z8GIMhE`), Figtree, Phosphor, Motion, green mineral theme
- **Auth**: Better Auth via Convex (Google + verified email/password, reset, Resend webhooks)
- **Data**: notebooks, sources, chunks, chat, citations, quotas, soft-delete + batched cleanup
- **Sources**: URL/file/text add, realtime processing states, preview, selection, context boundaries
- **Chat**: grounded SSE (`/api/chat`), hybrid retrieval + rerank, citations, cancel/retry, mobile Sources/Chat tabs
- **Docs**: `PRODUCT.md`, `DESIGN.md`, and setup/deploy guide in `README.md`

### Next steps for you
1. `bunx convex login` then `bunx convex dev` (regenerates `_generated` + component types)
2. Fill Convex + `.env.local` from `.env.example` (Google, OpenAI, Voyage, Resend)
3. `bun run dev` alongside Convex

Verification already run: `bun run test`, `bun run types`, `bun run fix`, `bun run build`.

