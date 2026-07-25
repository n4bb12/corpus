# Corpus

NotebookLM-style grounded research notebooks. Add URL, file, or pasted-text sources, then chat with citations that open the exact passage.

## Architecture

```text
TanStack Start (Vercel)
  ├── Better Auth proxy  →  Convex HTTP (/api/auth)
  ├── Chat SSE bridge    →  Convex prepare + Voyage/OpenAI
  └── ConvexReactClient + convex-helpers query cache

Convex
  ├── Better Auth component
  ├── Plunk transactional email
  ├── Notebooks / sources / chunks / chat / citations
  ├── Ingestion actions (MarkItDown → semantic-chunker → Voyage embeddings)
  └── Hybrid retrieval (vector + text → Voyage rerank)
```

## Local setup (Bun)

### 1. Install

```bash
bun install
```

### 2. Convex

```bash
bunx convex login
bunx convex dev
```

Copy the printed `VITE_CONVEX_URL` values into `.env.local`. Also set:

```bash
bunx convex env set SITE_URL http://localhost:3000
bunx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
```

### 3. Environment files

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Required local keys:

| Name | Purpose |
| --- | --- |
| `CONVEX_DEPLOYMENT` | Convex deployment name |
| `VITE_CONVEX_URL` | Convex cloud URL |
| `VITE_CONVEX_SITE_URL` | Convex `.site` URL |
| `VITE_SITE_URL` | Local app origin (`http://localhost:3000`) |

Set these on the Convex deployment (Dashboard or `bunx convex env set`):

| Name | Purpose |
| --- | --- |
| `SITE_URL` | Public site URL used by Better Auth |
| `BETTER_AUTH_SECRET` | Auth encryption/hashing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `OPENAI_API_KEY` | Chat + title models |
| `VOYAGE_API_KEY` | Embeddings + rerank |
| `PLUNK_API_KEY` | Plunk secret API key |
| `PLUNK_FROM_EMAIL` | Verified sender address |
| `PLUNK_FROM_NAME` | Optional display name (defaults to `Corpus`) |

Do not commit secret values.

### 4. Google OAuth

In Google Cloud Console create an OAuth client and add both local and production origins:

- Authorized JavaScript origins:
  - `http://localhost:3000`
  - `https://corpus-n4bb12.vercel.app`
- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://corpus-n4bb12.vercel.app/api/auth/callback/google`

Better Auth trusts both hosts via `trustedOrigins` / `baseURL.allowedHosts`, so magic links and OAuth work from either origin.

### 5. Plunk

1. Verify your sending domain in Plunk.
2. Set `PLUNK_API_KEY` and `PLUNK_FROM_EMAIL` on Convex.
3. Optionally set `PLUNK_FROM_NAME` (defaults to `Corpus`).

### 6. Run

```bash
# terminal 1
bunx convex dev

# terminal 2
bun run dev
```

App: [http://localhost:3000](http://localhost:3000)

## Supported sources and limits

Accepted files: PDF, DOCX, XLSX, HTML, TXT, Markdown, CSV, XML, RSS, Atom, IPYNB.

| Limit | Value |
| --- | --- |
| Notebooks / account | 100 |
| Sources / notebook | 20 |
| Ingestions / user / day | 50 |
| Generations / user / day | 100 |
| Upload size | 20 MB |
| URL response | 2 MB |
| Pasted text | 200,000 chars |
| Extracted text | 500,000 chars |
| Chat prompt | 4,000 chars |

## Deployment

### Convex

```bash
bunx convex deploy
```

Set the same Convex env vars for production, with `SITE_URL` equal to your Vercel URL.

### Vercel

1. Import the GitHub repo.
2. Framework preset: other / Vite. Build command `bun run build`, output via Nitro.
3. Set:

| Name | Value |
| --- | --- |
| `VITE_CONVEX_URL` | Production Convex URL |
| `VITE_CONVEX_SITE_URL` | Production Convex site URL |
| `VITE_SITE_URL` | `https://your-app.vercel.app` |
| `OPENAI_API_KEY` | Same as Convex if the SSE route reads it locally |

4. Keep Google OAuth redirect URIs for both `http://localhost:3000` and `https://corpus-n4bb12.vercel.app`. Set Convex `SITE_URL` to the production origin as the fallback.
5. Deploy.

Chat streaming runs from the TanStack Start `/api/chat` route on Vercel and persists through authenticated Convex mutations/actions.

## Verification

```bash
bun run test
bun run types
bun run fix
bun run build
```

Before calling the deployment done, manually verify Google sign-in, magic-link sign-in, one URL/file/text ingestion, grounded chat, citations, and light/dark layouts.

## Product docs

- Challenge: `docs/1 challenge.md`
- Plan: `docs/2 plan.md`
- Product boundary: `PRODUCT.md`
- Visual system: `DESIGN.md`

## v1 exclusions

Studio, audio overviews, sharing/collaboration, native apps, account deletion, profile editing, MFA, and a marketing site are out of scope.
