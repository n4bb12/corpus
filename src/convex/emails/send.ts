import type { GenericCtx } from "@convex-dev/better-auth"
import { Resend, vOnEmailEventArgs } from "@convex-dev/resend"
import { components, internal } from "../_generated/api"
import type { DataModel } from "../_generated/dataModel"
import { internalMutation } from "../_generated/server"

export const resend: Resend = new Resend(components.resend, {
	testMode: process.env.RESEND_TEST_MODE !== "false",
	onEmailEvent: internal.emails.send.handleEmailEvent,
})

const fromAddress =
	process.env.RESEND_FROM_EMAIL ?? "Corpus <onboarding@resend.dev>"

function emailShell(title: string, body: string, href: string, cta: string) {
	return `<!doctype html>
<html>
  <body style="background:#F1F3EE;font-family:Figtree,Helvetica,Arial,sans-serif;margin:0;padding:24px;">
    <div style="max-width:28rem;margin:0 auto;background:#FAFBF8;border-radius:16px;padding:32px;">
      <h1 style="color:#1E2823;font-size:24px;margin:0 0 12px;">${title}</h1>
      <p style="color:#68736C;font-size:15px;line-height:1.6;margin:0 0 20px;">${body}</p>
      <a href="${href}" style="background:#245844;border-radius:10px;color:#FAFBF8;display:inline-block;padding:12px 18px;text-decoration:none;">${cta}</a>
    </div>
  </body>
</html>`
}

export async function sendVerificationEmail(
	ctx: GenericCtx<DataModel>,
	args: { to: string; url: string },
) {
	if (!("runMutation" in ctx) && !("scheduler" in ctx)) {
		return
	}

	await resend.sendEmail(ctx as never, {
		from: fromAddress,
		to: args.to,
		subject: "Verify your Corpus email",
		html: emailShell(
			"Verify your email",
			"Confirm your address to finish creating your Corpus account.",
			args.url,
			"Verify email",
		),
	})
}

export async function sendPasswordResetEmail(
	ctx: GenericCtx<DataModel>,
	args: { to: string; url: string },
) {
	if (!("runMutation" in ctx) && !("scheduler" in ctx)) {
		return
	}

	await resend.sendEmail(ctx as never, {
		from: fromAddress,
		to: args.to,
		subject: "Reset your Corpus password",
		html: emailShell(
			"Reset your password",
			"Use the button below to choose a new password. If you did not ask for this, you can ignore the message.",
			args.url,
			"Reset password",
		),
	})
}

export const handleEmailEvent = internalMutation({
	args: vOnEmailEventArgs,
	handler: async (ctx, args) => {
		await ctx.db.insert("emailEvents", {
			emailId: String(args.id),
			eventType: args.event.type,
			createdAt: Date.now(),
			payload: JSON.stringify(args.event),
		})
	},
})
