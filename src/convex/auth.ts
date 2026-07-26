import type { GenericCtx } from "@convex-dev/better-auth"
import { createClient } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth/minimal"
import { magicLink } from "better-auth/plugins/magic-link"
import { requireEnv } from "src/lib/env"
import { components } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"
import { query } from "./_generated/server"
import authConfig from "./auth.config"
import { sendMagicLinkEmail } from "./emails/send"

const siteUrl = requireEnv("SITE_URL")

const trustedOrigins = [
	"http://localhost:3000",
	"https://corpus-n4bb12.vercel.app",
] as const

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
	return betterAuth({
		appName: "Corpus",
		baseURL: {
			allowedHosts: ["localhost:3000", "corpus-n4bb12.vercel.app"],
			fallback: siteUrl,
			protocol: "auto",
		},
		trustedOrigins: [...trustedOrigins],
		secret: requireEnv("BETTER_AUTH_SECRET"),
		database: authComponent.adapter(ctx),
		socialProviders: {
			google: {
				clientId: requireEnv("GOOGLE_CLIENT_ID"),
				clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
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
		plugins: [
			magicLink({
				sendMagicLink: async ({ email, url }) => {
					await sendMagicLinkEmail(ctx, {
						to: email,
						url,
					})
				},
			}),
			convex({ authConfig }),
		],
	})
}

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		return await authComponent.getAuthUser(ctx)
	},
})

export const { getAuthUser } = authComponent.clientApi()
