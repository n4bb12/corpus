import type { GenericCtx } from "@convex-dev/better-auth"
import { createClient } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth/minimal"
import { components } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"
import { query } from "./_generated/server"
import authConfig from "./auth.config"
import { sendPasswordResetEmail, sendVerificationEmail } from "./emails/send"

const siteUrl = process.env.SITE_URL!

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
	return betterAuth({
		appName: "Corpus",
		baseURL: siteUrl,
		secret: process.env.BETTER_AUTH_SECRET,
		database: authComponent.adapter(ctx),
		socialProviders: {
			google: {
				clientId: process.env.GOOGLE_CLIENT_ID as string,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
			},
		},
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			sendResetPassword: async ({ user, url }) => {
				await sendPasswordResetEmail(ctx, {
					to: user.email,
					url,
				})
			},
		},
		emailVerification: {
			sendOnSignUp: true,
			autoSignInAfterVerification: true,
			sendVerificationEmail: async ({ user, url }) => {
				await sendVerificationEmail(ctx, {
					to: user.email,
					url,
				})
			},
		},
		account: {
			accountLinking: {
				enabled: true,
				trustedProviders: ["google"],
			},
		},
		session: {
			expiresIn: 60 * 60 * 24 * 30,
			updateAge: 60 * 60 * 24,
		},
		plugins: [convex({ authConfig })],
	})
}

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		return await authComponent.getAuthUser(ctx)
	},
})

export const { getAuthUser } = authComponent.clientApi()
