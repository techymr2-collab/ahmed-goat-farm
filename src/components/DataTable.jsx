import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import Pagination from './Pagination'
import { TableSkeleton } from './Skeleton'
import { PAGE_SIZE } from '../hooks/usePagedQuery'

/**
 * Table on desktop, stacked cards on phones.
 *
 * columns: [{ header, cell: (row) => node, align?: 'right' }] — the first column
 * is the card title on mobile.
 * Pagination is server-driven when `totalCount` + `page` + `onPageChange` are
 * given; otherwise rows are paged in the browser.
 */
export default function DataTable({
  columns,
  rows,
  loading,
  empty,
  actions,
  rowKey = (row) => row.id,
  minWidth = 640,
  page,
  onPageChange,
  totalCount,
  pageSize = PAGE_SIZE,
}) {
  const [localPage, setLocalPage] = useState(1)
  const serverPaged = totalCount !== undefined && onPageChange !== undefined

  const total = serverPaged ? (totalCount ?? 0) : rows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(serverPaged ? page : localPage, pageCount)
  const visibleRows = serverPaged ? rows : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  if (loading && rows.length === 0) return <TableSkeleton />
  if (!loading && rows.length === 0) return empty ?? null

  const [titleColumn, ...detailColumns] = columns

  return (
    <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth }}>
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {columns.map((col) => (
                  <th key={col.header} scope="col" className={`px-4 py-3 font-medium ${col.align === 'right' ? 'text-right' : ''}`}>
                    {col.header}
                  </th>
                ))}
                {actions && (
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-border last:border-0 hover:bg-muted/30">
                  {columns.map((col) => (
                    <td key={col.header} className={`px-4 py-3 text-muted-foreground ${col.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                      {col.cell(row)}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile */}
      <ul className="space-y-3 md:hidden">
        {visibleRows.map((row) => (
          <li key={rowKey(row)} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm font-medium text-foreground">{titleColumn.cell(row)}</div>
              {actions && <div className="-mr-2 -mt-1 flex shrink-0 gap-1">{actions(row)}</div>}
            </div>
            {detailColumns.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {detailColumns.map((col) => (
                  <div key={col.header} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{col.header}</dt>
                    <dd className="truncate text-foreground">{col.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>

      <Pagination
        page={currentPage}
        pageCount={pageCount}
        onPageChange={serverPaged ? onPageChange : setLocalPage}
        totalItems={total}
        pageSize={pageSize}
      />
    </div>
  )
}

export function RowActions({ label, onEdit, onDelete }) {
  return (
    <>
      {onEdit && (
        <button
          type="button"
          aria-label={`Edit ${label}`}
          onClick={onEdit}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil size={15} aria-hidden="true" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          aria-label={`Delete ${label}`}
          onClick={onDelete}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      )}
    </>
  )
}
