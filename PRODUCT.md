# Corpus Product

Corpus is a NotebookLM-style MVP for grounded research over personal sources.

## In scope (v1)

- Google OAuth and magic-link email authentication
- Notebook library with search, cursor pagination, create, rename, and permanent delete
- URL, file, and pasted-text sources with realtime processing states
- One strictly source-grounded chat thread per notebook
- Paragraph-level citations with exact source passages
- Responsive desktop and mobile layouts

## Out of scope (v1)

- Studio features and audio overviews
- Sharing and collaboration
- Native apps
- Account deletion, profile editing, and MFA
- Marketing site

## Core behaviors

- Notebooks start as `Untitled notebook` and can receive one automatic title after the first successful source.
- Chat answers only from ready, selected sources. Missing evidence is stated plainly.
- Source changes create a context boundary; earlier exchanges stay visible but leave future prompts.
- Deletion is immediate for the UI, with bounded background cleanup of storage and dependents.

## Limits

| Resource | Limit |
| --- | --- |
| Notebooks per account | 100 |
| Visible sources per notebook | 20 |
| Source ingestions per user per day | 50 |
| Chat generations per user per day | 100 |
| Active generations per notebook | 1 |
| Uploaded file size | 20 MB |
| Fetched URL response | 2 MB |
| Pasted text | 200,000 characters |
| Extracted source text | 500,000 characters |
| Chat prompt | 4,000 characters |
