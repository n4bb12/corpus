import { LIMITS } from "src/lib/limits"

export function libraryBrowseLimit(page: number) {
  return page <= 1 ? LIMITS.libraryFirstPageSize : LIMITS.libraryPageSize
}

export function libraryBrowseOffset(page: number) {
  if (page <= 1) {
    return 0
  }

  return LIMITS.libraryFirstPageSize + (page - 2) * LIMITS.libraryPageSize
}

export function libraryBrowsePageCount(total: number) {
  if (total <= LIMITS.libraryFirstPageSize) {
    return total > 0 ? 1 : 0
  }

  return (
    1 +
    Math.ceil((total - LIMITS.libraryFirstPageSize) / LIMITS.libraryPageSize)
  )
}

export function librarySearchOffset(page: number) {
  return Math.max(0, page - 1) * LIMITS.libraryPageSize
}

export function librarySearchPageCount(total: number) {
  if (!total) {
    return 0
  }

  return Math.ceil(total / LIMITS.libraryPageSize)
}

export function clampLibraryPage(page: number, pageCount: number) {
  if (pageCount <= 0) {
    return 1
  }

  return Math.min(Math.max(1, page), pageCount)
}
