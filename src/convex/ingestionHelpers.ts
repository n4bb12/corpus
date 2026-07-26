import { v } from "convex/values"
import { internalQuery } from "./_generated/server"

export const getSource = internalQuery({
	args: {
		sourceId: v.id("sources"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.sourceId)
	},
})
