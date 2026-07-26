import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { formatDistanceToNow } from "date-fns"
import { BookOpen, Plus, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { AppHeader } from "src/components/layout/AppHeader"
import { NotebookCard } from "src/components/library/NotebookCard"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { PendingLabel } from "src/components/ui/PendingLabel"
import { api } from "src/convex/_generated/api"
import type { Id } from "src/convex/_generated/dataModel"
import { authClient } from "src/lib/auth-client"
import { LIMITS } from "src/lib/limits"
import { normalizeTitle } from "src/lib/source_title"
import { useSignedInQueryArgs } from "src/lib/use-signed-in"

const routeApi = getRouteApi("/")

export function LibraryPage() {
	const navigate = useNavigate()
	const search = routeApi.useSearch()
	const [draft, setDraft] = useState(search.q ?? "")
	const createNotebook = useMutation(api.notebooks.create)
	const removeNotebook = useMutation(api.notebooks.remove)
	const renameNotebook = useMutation(api.notebooks.rename).withOptimisticUpdate(
		(localStore, args) => {
			const title = normalizeTitle(args.title, "")

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
		},
	)
	const session = authClient.useSession()

	const [creating, setCreating] = useState(false)

	useEffect(() => {
		const handle = window.setTimeout(() => {
			if ((search.q ?? "") === draft) {
				return
			}

			void navigate({
				to: "/",
				search: {
					q: draft || undefined,
					cursor: undefined,
				},
			})
		}, 250)

		return () => window.clearTimeout(handle)
	}, [draft, navigate, search.q])

	const listArgs = useSignedInQueryArgs({
		search: search.q || undefined,
		cursor: search.cursor,
		limit: LIMITS.libraryPageSize,
	})
	const result = useQuery(api.notebooks.list, listArgs)

	const placeholders = useMemo(
		() =>
			Array.from({ length: 8 }, (_, index) => ({
				_id: `placeholder-${index}`,
				title: "Loading notebook title goes here",
				lastUsedAt: Date.now(),
				sourceCount: 3,
			})),
		[],
	)

	const isLoading = result === undefined
	const page = isLoading ? placeholders : result.page
	const isEmpty = !isLoading && !search.q && !result.page.length
	const noMatches = !isLoading && !!search.q && !result.page.length
	const showPagination =
		!isLoading && (!!search.cursor || (result !== undefined && !result.isDone))

	async function onCreate() {
		setCreating(true)

		try {
			const notebookId = await createNotebook({})
			await navigate({
				to: "/notebooks/$notebookId",
				params: { notebookId },
				search: { tab: "sources" },
			})
		} catch {
			setCreating(false)
		}
	}

	return (
		<div className="atmosphere atmosphere-noise relative min-h-dvh">
			<div className="relative z-10">
				<AppHeader
					email={session.data?.user.email}
					name={session.data?.user.name}
				/>
				<main className="mx-auto w-full max-w-[84rem] px-4 py-8 md:px-6">
					<div className="mb-4 flex items-center justify-between gap-4">
						<h1 className="text-2xl font-semibold tracking-tight">
							Your notebooks
						</h1>
						<Button
							className="rounded-sm"
							disabled={creating}
							onClick={() => void onCreate()}
						>
							<PendingLabel pending={creating} pendingLabel="Creating notebook">
								<span className="inline-flex items-center">
									<Plus size={16} className="mr-1.5" />
									New notebook
								</span>
							</PendingLabel>
						</Button>
					</div>

					<div className="relative mb-8 w-full md:w-80">
						<Search
							size={16}
							className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							placeholder="Search notebooks"
							className="rounded-xl pl-9"
							aria-label="Search notebooks"
						/>
					</div>

					{isEmpty ? (
						<div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-8 shadow-(--shadow-pine)">
							<span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
								<BookOpen size={28} />
							</span>
							<div className="space-y-2">
								<h2 className="text-xl font-semibold">
									Create your first notebook
								</h2>
								<p className="max-w-md text-sm text-muted-foreground">
									Add sources, ask grounded questions, and keep citations next
									to every answer.
								</p>
							</div>
							<Button
								className="rounded-sm"
								disabled={creating}
								onClick={() => void onCreate()}
							>
								<PendingLabel
									pending={creating}
									pendingLabel="Creating notebook"
								>
									<span className="inline-flex items-center">
										<Plus size={16} className="mr-1.5" />
										New notebook
									</span>
								</PendingLabel>
							</Button>
						</div>
					) : null}

					{noMatches ? (
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								No notebooks match “{search.q}”
							</p>
							<Button
								variant="outline"
								className="rounded-sm"
								onClick={() => {
									setDraft("")
									void navigate({ to: "/", search: {} })
								}}
							>
								Clear search
							</Button>
						</div>
					) : null}

					{!isEmpty && !noMatches ? (
						<>
							<div
								className="grid gap-4 max-sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
								aria-busy={isLoading}
							>
								{isLoading ? (
									<span className="sr-only" role="status">
										Loading notebooks
									</span>
								) : null}
								{page.map((notebook: any) => (
									<NotebookCard
										key={notebook._id}
										notebookId={String(notebook._id)}
										title={notebook.title}
										lastUsedLabel={formatDistanceToNow(notebook.lastUsedAt, {
											addSuffix: true,
										})}
										sourceCount={notebook.sourceCount}
										loading={isLoading}
										onRename={async (title) => {
											await renameNotebook({
												notebookId: notebook._id as Id<"notebooks">,
												title,
											})
										}}
										onDelete={async () => {
											await removeNotebook({
												notebookId: notebook._id as Id<"notebooks">,
											})
										}}
									/>
								))}
							</div>

							{showPagination ? (
								<div className="mt-8 flex items-center justify-center gap-3">
									<Button
										variant="outline"
										className="rounded-sm"
										disabled={!search.cursor}
										onClick={() =>
											void navigate({
												to: "/",
												search: {
													q: search.q,
													cursor: undefined,
												},
											})
										}
									>
										Previous
									</Button>
									<Button
										variant="outline"
										className="rounded-sm"
										disabled={isLoading || result?.isDone}
										onClick={() =>
											void navigate({
												to: "/",
												search: {
													q: search.q,
													cursor: result?.continueCursor ?? undefined,
												},
											})
										}
									>
										Next
									</Button>
								</div>
							) : null}
						</>
					) : null}
				</main>
			</div>
		</div>
	)
}
