import type { GenericCtx } from "@convex-dev/better-auth"
import { requireEnv } from "src/lib/env"
import type { DataModel } from "../_generated/dataModel"
import { appError } from "../lib/appError"

const PLUNK_API_URL = "https://next-api.useplunk.com/v1/send"

function getPlunkApiKey() {
  const key = requireEnv("PLUNK_API_KEY").trim()

  if (!key.startsWith("sk_")) {
    throw appError(
      "PLUNK_API_KEY must be the secret key (sk_…). Public keys (pk_…) cannot send email.",
    )
  }

  return key
}

function getFromAddress() {
  return {
    from: requireEnv("PLUNK_FROM_EMAIL").trim(),
    name: (process.env.PLUNK_FROM_NAME || "Corpus").trim(),
  }
}

function emailShell(title: string, body: string, href: string, cta: string) {
  return `<!doctype html>
<html>
  <body style="background:#F1F3EE;font-family:Outfit,Helvetica,Arial,sans-serif;margin:0;padding:24px;">
    <div style="max-width:28rem;margin:0 auto;background:#FAFBF8;border-radius:16px;padding:32px;">
      <h1 style="color:#1E2823;font-size:24px;margin:0 0 12px;">${title}</h1>
      <p style="color:#68736C;font-size:15px;line-height:1.6;margin:0 0 20px;">${body}</p>
      <a href="${href}" style="background:#245844;border-radius:10px;color:#FAFBF8;display:inline-block;padding:12px 18px;text-decoration:none;">${cta}</a>
    </div>
  </body>
</html>`
}

export async function sendMagicLinkEmail(
  _ctx: GenericCtx<DataModel>,
  args: { to: string; url: string },
) {
  const from = getFromAddress()
  const response = await fetch(PLUNK_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPlunkApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: args.to,
      from: from.from,
      name: from.name,
      subject: "Sign in to Corpus",
      body: emailShell(
        "Your sign-in link",
        "Use the button below to sign in to Corpus. If you did not ask for this, you can ignore the message.",
        args.url,
        "Sign in",
      ),
      type: "html",
    }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string
    } | null
    const message = payload?.message || "Couldn't send the sign-in email."

    if (response.status === 401) {
      throw appError(
        `${message} Check that Convex PLUNK_API_KEY is the secret key (sk_…) from Plunk → Settings → API Keys.`,
      )
    }

    throw appError(message)
  }
}
