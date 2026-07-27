import { UNTITLED_NOTEBOOK } from "src/lib/limits"

export function notebookMatchesSearch(title: string, search: string) {
  const needle = search.trim().toLowerCase()

  if (!needle) {
    return true
  }

  const display = title.trim() || UNTITLED_NOTEBOOK

  return display.toLowerCase().includes(needle)
}
