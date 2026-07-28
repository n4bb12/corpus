# CONTEXT.md

Domain vocabulary for Corpus. Prefer these names in code, plans, and architecture discussion.

## Product concepts

- **Notebook** — a research workspace with Sources and one grounded Chat thread.
- **Source** — URL, uploaded file, or pasted text belonging to a Notebook; processed to markdown, chunks, and optional digest.
- **Source digest** — short grounded summary of a ready Source, with supporting Citation quotes. Produced during Source ingestion; never created mid-Chat.
- **Chat** — the single source-grounded thread per Notebook.
- **Citation** — a numbered marker in an assistant answer pointing at an exact Source passage (quote + locator).
- **Evidence** — the packed chunk/digest context used to ground one answer turn. Only ready Sources and ready digests at submit time count.

## Modules (deepening targets)

- **Quote grounding** — locate a model quote in chunk or Source markdown → excerpt, range, locator.
- **Answer turn** — given evidence + history + a generation port, produce answer content and Citation catalog.
- **Evidence pack** — classify, retrieve/rerank or digest-pack, and format prompt-ready evidence for an Answer turn. Consumes digests; does not ensure them.
- **Title refresh** — schedule and propose automatic Notebook titles from ready Source digests (or markdown fallback).
- **Add Sources** — client module for pending rows, upload, ingest POST, and LIMITS when adding Sources.
