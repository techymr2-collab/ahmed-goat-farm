import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pageCount, onPageChange, totalItems, pageSize }) {
  if (pageCount <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
