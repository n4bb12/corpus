import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import { ChatPane } from "src/components/chat/ChatPane"
import { AppHeader } from "src/components/layout/AppHeader"
import { InlineNotebookTitle } from "src/components/notebook/InlineNotebookTitle"
import { SourcesPane } from "src/components/sources/SourcesPane"
import { Popover, PopoverContent } from "src/components/ui/popover"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { authClient } from "src/lib/auth-client"
import { layoutTransition } from "src/lib/motion"
import { normalizeTitle } from "src/lib/source_title"
import { useIsSignedIn, useSignedInQueryArgs } from "src/lib/use-signed-in"
import { cn } from "src/lib/utils"

const routeApi = getRouteApi("/notebooks/$notebookId")

export function NotebookPage() {
	const { notebookId } = routeApi.useParams()
	const search = routeApi.useSearch()
	const navigate = useNavigate()
	const isSignedIn = useIsSignedIn()
	const session = authClient.useSession()
	const notebookArgs = useSignedInQueryArgs({
		notebookId: notebookId as Id<"notebooks">,
	})
	const notebook = useQuery(api.notebooks.get, notebookArgs)
	const sources = useQuery(api.sources.listByNotebook, notebookArgs)
	const rename = useMutation(api.notebooks.rename).withOptimisticUpdate(
		(localStore, args) => {
			const title = normalizeTitle(args.title, "")
			const current = localStore.getQuery(api.notebooks.get, {
				notebookId: args.notebookId,
			})

			if (current) {
				localStore.setQuery(
					api.notebooks.get,
					{ notebookId: args.notebookId },
					{ ...current, title },
				)
			}

			for (const { args: queryArgs, value } of localStore.getAllQueries(
				api.notebooks.list,
			)) {
				if (!value) {
					continue
				}

				localStore.setQuery(api.notebooks.list, queryArgs, {
					...value,
					page: value.page.map((notebook) =>
						notebook._id === args.notebookId
							? { ...notebook, title }
							: notebook,
					),
				})
			}
		},
	)
	const touch = useMutation(api.notebooks.touch)
	const [previewSourceId, setPreviewSourceId] = useState<string | null>(null)
	const [highlight, setHighlight] = useState<{
		start: number
		end: number
	} | null>(null)
	const [excerptOnly, setExcerptOnly] = useState<string | null>(null)
	const [addSourceOpen, setAddSourceOpen] = useState(false)

	useEffect(() => {
		if (!isSignedIn) {
			return
		}

		void touch({ notebookId: notebookId as Id<"notebooks"> })
	}, [isSignedIn, notebookId, touch])

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
				<div className="grid grid-cols-2 rounded-xl bg-muted p-1 shadow-(--shadow-pine)">
					{(["sources", "chat"] as const).map((value) => (
						<button
							key={value}
							type="button"
							className={cn(
								"rounded-sm px-3 py-2 text-sm font-medium capitalize transition",
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
						addOpen={addSourceOpen}
						onAddOpenChange={setAddSourceOpen}
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
								onAddSource={() => {
									setPreviewSourceId(null)
									setTab("sources")
									setAddSourceOpen(true)
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
