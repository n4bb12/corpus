# Tanstack Vercel output adapter
_Exported on 7/26/2026 at 01:47:28 GMT+2 from Cursor (3.13.10)_

---

**User**

Use the tanstack vercel output adapter.

---

**Cursor**

I'll check the current Vite/TanStack setup and switch it to the Vercel output adapter.

Checking TanStack Start docs for the Vercel adapter setup.

Looking for a dedicated TanStack Vercel adapter package — docs currently point at Nitro for Vercel.

Configuring Nitro's Vercel preset (TanStack Start's Vercel output adapter) and aligning deploy config.

Last build used Nitro's `bun` preset (auto-detected because the project runs with Bun), so Vercel wasn't getting the right output. Locking the preset to `vercel`.

Done. Nitro was auto-picking the **`bun`** preset (because you build with Bun), so Vercel never got Build Output API artifacts.

Changes:
1. **`vite.config.ts`** — `nitro({ preset: "vercel", ... })`
2. **`vercel.json`** — `"framework": "tanstack-start"`
3. **`package.json`** — `start` uses `vite preview` (no more `.output/server`)
4. **`README.md`** — deploy notes updated

`bun run build` now emits `.vercel/output` (static + `__server.func`).

---

**User**

<timestamp>Sunday, Jul 26, 2026, 1:35 AM (UTC+2)</timestamp>
<system_notification>
The following task has finished. If you were already aware, ignore this notification and do not restate prior responses.

<task>
kind: shell
status: success
task_id: 239747
title: Search for TanStack vercel adapter package
tool_call_id: call-917bfae0-afcb-498a-a628-1c03129b82f9-31
fc_f54782e5-3c48-91fc-9906-675ca8ef1b5c_0
output_path: /home/n4bb12/.cursor/projects/home-n4bb12-git-work-interviews-corpus/terminals/239747.txt
</task>
</system_notification>
<user_query>Briefly inform the user about the task result and perform any follow-up actions (if needed). If there's no follow-ups needed, don't explicitly say that.</user_query>

---

**Cursor**

That background search finished: there’s no separate `@tanstack/vercel` package. Vercel deploy for TanStack Start is Nitro’s `preset: "vercel"`, which is what’s already wired up.

---

**User**

why rollupConfig: { external: [/^@sentry\//] },

---

**Cursor**

It’s leftover scaffold from the TanStack create template (the optional Sentry add-on). It tells Nitro not to bundle `@sentry/*` into the server build.

This project doesn’t use Sentry anywhere, so that line does nothing useful and can be removed.

