# AGENTS.md

## Orchestration vs writes

- **Orchestration** (multi-step flows, LLM calls, `waitUntil` / background work) lives in **API routes** and shared modules under `src/server/**`.
- **Durable writes** are **focused Convex mutations**. Routes and server modules call those mutations; do not put LLM orchestration in Convex actions.
- **Thin realtime CRUD** (e.g. select/deselect, non-empty Notebook rename) may stay client → Convex.
- Server pipelines (e.g. Source ingest) may call the same orchestrator modules **in-process**. They must not reimplement policy that already lives in those modules.

## Domain

See [CONTEXT.md](CONTEXT.md) for product vocabulary and named modules.
