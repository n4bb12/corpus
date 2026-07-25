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
  ├── Resend component + webhook
  ├── Notebooks / sources / chunks / chat / citations
  ├── Ingestion actions (MarkItDown → Mastra chunks → Voyage embeddings)
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
| `RESEND_API_KEY` | Transactional email |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `Corpus <noreply@yourdomain.com>` |
| `RESEND_WEBHOOK_SECRET` | Resend webhook signing secret |
| `RESEND_TEST_MODE` | `false` for real delivery |

Do not commit secret values.

### 4. Google OAuth

In Google Cloud Console create an OAuth client and add:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

For production, repeat with your Vercel URL.

### 5. Resend

1. Verify your sending domain in Resend.
2. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` on Convex.
3. Create a webhook pointing to:

   `https://<your-deployment>.convex.site/resend-webhook`

4. Subscribe to delivery events and set `RESEND_WEBHOOK_SECRET`.
5. Set `RESEND_TEST_MODE=false` when ready for real addresses.

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

4. Update Google OAuth redirect URIs and Convex `SITE_URL` to the production origin.
5. Deploy.

Chat streaming runs from the TanStack Start `/api/chat` route on Vercel and persists through authenticated Convex mutations/actions.

## Verification

```bash
bun run test
bun run types
bun run fix
bun run build
```

Before calling the deployment done, manually verify Google sign-in, email verification, one URL/file/text ingestion, grounded chat, citations, and light/dark layouts.

## Product docs

- Challenge: `docs/1 challenge.md`
- Plan: `docs/2 plan.md`
- Product boundary: `PRODUCT.md`
- Visual system: `DESIGN.md`

## v1 exclusions

Studio, audio overviews, sharing/collaboration, native apps, account deletion, profile editing, MFA, and a marketing site are out of scope.
