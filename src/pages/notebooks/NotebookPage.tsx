import { AppHeader } from "src/components/layout/AppHeader"
import { CitationExcerptPopover } from "src/components/notebook/CitationExcerptPopover"
import { InlineNotebookTitle } from "src/components/notebook/InlineNotebookTitle"
import { NotebookMobileTabs } from "src/components/notebook/NotebookMobileTabs"
import { NotebookWorkspace } from "src/components/notebook/NotebookWorkspace"
import { useNotebookPage } from "src/pages/notebooks/useNotebookPage"

export function NotebookPage() {
	const page = useNotebookPage()

	return (
		<div className="atmosphere flex h-dvh flex-col overflow-hidden">
			<AppHeader
				email={page.session.data?.user.email}
				name={page.session.data?.user.name}
				notebookTitle={
					page.notebook ? (
						<InlineNotebookTitle
							title={page.notebook.title}
							onSave={async (title) => {
								const notebook = page.notebook

								if (!notebook) {
									return
								}

								await page.rename({
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

			<NotebookMobileTabs tab={page.tab} onTabChange={page.setTab} />

			<NotebookWorkspace
				notebookId={page.notebookId}
				tab={page.tab}
				previewSourceId={page.previewSourceId}
				highlight={page.highlight}
				addSourceOpen={page.addSourceOpen}
				onPreviewSource={page.setPreviewSourceId}
				onAddSourceOpenChange={page.setAddSourceOpen}
				onTabChange={page.setTab}
				onExcerptOnly={page.setExcerptOnly}
				onHighlight={page.setHighlight}
			/>

			<CitationExcerptPopover
				excerpt={page.excerptOnly}
				onOpenChange={(open) => !open && page.setExcerptOnly(null)}
			/>
		</div>
	)
}
