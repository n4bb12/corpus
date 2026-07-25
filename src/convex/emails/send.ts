import type { GenericCtx } from "@convex-dev/better-auth"
import Plunk from "@plunk/node"
import type { DataModel } from "../_generated/dataModel"

function getPlunkClient() {
	const apiKey = process.env.PLUNK_API_KEY

	if (!apiKey) {
		throw new Error("PLUNK_API_KEY is not set")
	}

	return new Plunk(apiKey)
}

function getFromAddress() {
	const fromEmail = process.env.PLUNK_FROM_EMAIL

	if (!fromEmail) {
		throw new Error("PLUNK_FROM_EMAIL is not set")
	}

	return {
		from: fromEmail,
		name: process.env.PLUNK_FROM_NAME || "Corpus",
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

async function sendEmail(args: {
	to: string
	subject: string
	title: string
	body: string
	href: string
	cta: string
}) {
	const plunk = getPlunkClient()
	const from = getFromAddress()

	await plunk.emails.send({
		to: args.to,
		from: from.from,
		name: from.name,
		subject: args.subject,
		body: emailShell(args.title, args.body, args.href, args.cta),
		type: "html",
	})
}

export async function sendVerificationEmail(
	_ctx: GenericCtx<DataModel>,
	args: { to: string; url: string },
) {
	await sendEmail({
		to: args.to,
		subject: "Verify your Corpus email",
		title: "Verify your email",
		body: "Confirm your address to finish creating your Corpus account.",
		href: args.url,
		cta: "Verify email",
	})
}

export async function sendPasswordResetEmail(
	_ctx: GenericCtx<DataModel>,
	args: { to: string; url: string },
) {
	await sendEmail({
		to: args.to,
		subject: "Reset your Corpus password",
		title: "Reset your password",
		body: "Use the button below to choose a new password. If you did not ask for this, you can ignore the message.",
		href: args.url,
		cta: "Reset password",
	})
}

export async function sendMagicLinkEmail(
	_ctx: GenericCtx<DataModel>,
	args: { to: string; url: string },
) {
	await sendEmail({
		to: args.to,
		subject: "Sign in to Corpus",
		title: "Your sign-in link",
		body: "Use the button below to sign in to Corpus. If you did not ask for this, you can ignore the message.",
		href: args.url,
		cta: "Sign in",
	})
}
