import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import { z } from "zod"
import { ChatPane } from "#/components/chat/ChatPane"
import { AppHeader } from "#/components/layout/AppHeader"
import { InlineNotebookTitle } from "#/components/notebook/InlineNotebookTitle"
import { SourcesPane } from "#/components/sources/SourcesPane"
import { Popover, PopoverContent } from "#/components/ui/popover"
import { authClient } from "#/lib/auth-client"
import { getToken } from "#/lib/auth-server"
import { layoutTransition } from "#/lib/motion"
import { cn } from "#/lib/utils"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

const getAuth = createServerFn({ method: "GET" }).handler(async () =>
	getToken(),
)

export const Route = createFileRoute("/notebooks/$notebookId")({
	validateSearch: z.object({
		tab: z.enum(["sources", "chat"]).optional(),
	}),
	beforeLoad: async () => {
		const token = await getAuth()

		if (!token) {
			throw redirect({ to: "/sign-in" })
		}
	},
	component: NotebookPage,
})

function NotebookPage() {
	const { notebookId } = Route.useParams()
	const search = Route.useSearch()
	const navigate = useNavigate()
	const session = authClient.useSession()
	const notebook = useQuery(api.notebooks.get, {
		notebookId: notebookId as Id<"notebooks">,
	})
	const sources = useQuery(api.sources.listByNotebook, {
		notebookId: notebookId as Id<"notebooks">,
	})
	const rename = useMutation(api.notebooks.rename)
	const touch = useMutation(api.notebooks.touch)
	const [previewSourceId, setPreviewSourceId] = useState<string | null>(null)
	const [highlight, setHighlight] = useState<{
		start: number
		end: number
	} | null>(null)
	const [excerptOnly, setExcerptOnly] = useState<string | null>(null)

	useEffect(() => {
		void touch({ notebookId: notebookId as Id<"notebooks"> })
	}, [notebookId, touch])

	useEffect(() => {
		if (search.tab) {
			return
		}

		const hasSources = (sources?.length ?? 0) > 0
		void navigate({
			to: "/notebooks/$notebookId",
			params: { notebookId },
			search: { tab: hasSources ? "chat" : "sources" },
			replace: true,
		})
	}, [navigate, notebookId, search.tab, sources?.length])

	const tab = search.tab ?? "sources"

	function setTab(next: "sources" | "chat") {
		void navigate({
			to: "/notebooks/$notebookId",
			params: { notebookId },
			search: { tab: next },
		})
	}

	return (
		<div className="flex h-dvh flex-col overflow-hidden">
			<AppHeader
				workspace
				email={session.data?.user.email}
				name={session.data?.user.name}
				notebookTitle={
					notebook ? (
						<InlineNotebookTitle
							title={notebook.title}
							onSave={async (title) => {
								await rename({
									notebookId: notebook._id,
									title,
								})
							}}
						/>
					) : (
						<div className="h-7 w-48 placeholder-shimmer" aria-hidden />
					)
				}
			/>

			<div className="sticky top-16 z-20 border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:hidden">
				<div className="grid grid-cols-2 rounded-xl bg-muted p-1 shadow-[var(--shadow-pine)]">
					{(["sources", "chat"] as const).map((value) => (
						<button
							key={value}
							type="button"
							className={cn(
								"rounded-[10px] px-3 py-2 text-sm font-medium capitalize transition",
								tab === value
									? "bg-card text-foreground shadow-sm"
									: "text-muted-foreground",
							)}
							onClick={() => setTab(value)}
						>
							{value}
						</button>
					))}
				</div>
			</div>

			<div className="flex min-h-0 flex-1">
				<aside
					className={cn(
						"w-full border-r border-border md:block md:w-[25rem] md:shrink-0",
						tab === "sources" ? "block" : "hidden",
					)}
				>
					<SourcesPane
						notebookId={notebookId as Id<"notebooks">}
						previewSourceId={previewSourceId}
						highlightOffsets={highlight}
						onPreviewSource={setPreviewSourceId}
					/>
				</aside>

				<section
					className={cn(
						"min-w-0 flex-1",
						tab === "chat" ? "block" : "hidden md:block",
					)}
				>
					<AnimatePresence mode="wait" initial={false}>
						<motion.div
							key={tab}
							className="h-full"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={layoutTransition}
						>
							<ChatPane
								notebookId={notebookId as Id<"notebooks">}
								onOpenSources={() => {
									setPreviewSourceId(null)
									setTab("sources")
								}}
								onCite={({
									sourceId,
									startOffset,
									endOffset,
									excerpt,
									canNavigate,
								}) => {
									if (!canNavigate || !sourceId) {
										setExcerptOnly(excerpt)
										return
									}

									setPreviewSourceId(sourceId)
									setHighlight(
										typeof startOffset === "number" &&
											typeof endOffset === "number"
											? { start: startOffset, end: endOffset }
											: null,
									)
									setTab("sources")
								}}
							/>
						</motion.div>
					</AnimatePresence>
				</section>
			</div>

			<Popover
				open={!!excerptOnly}
				onOpenChange={(open) => !open && setExcerptOnly(null)}
			>
				<PopoverContent className="fixed right-4 bottom-4 z-50 max-w-sm rounded-xl">
					<p className="text-sm text-muted-foreground">{excerptOnly}</p>
				</PopoverContent>
			</Popover>
		</div>
	)
}
