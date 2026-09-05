// Reusable list pagination + page-size selector. Author: Piyush Kapoor.
import { useEffect, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const PAGE_SIZES = [10, 25, 50, 100] as const

export interface Pager {
  page: number
  pageSize: number // 0 = show all
  setPage: (p: number) => void
  setPageSize: (n: number) => void
  start: number
  end: number
  totalPages: number
}

/** `resetKey` — change it (e.g. a filter signature) to jump back to page 1. */
export function usePagination(total: number, resetKey: unknown = null): Pager {
  const [pageSize, setPageSize] = useState<number>(25)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [resetKey, pageSize])

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = pageSize === 0 ? 0 : (safePage - 1) * pageSize
  const end = pageSize === 0 ? total : Math.min(start + pageSize, total)

  return { page: safePage, pageSize, setPage, setPageSize, start, end, totalPages }
}

export function Pagination({ total, pager, label = 'rows' }: { total: number; pager: Pager; label?: string }) {
  const { page, pageSize, setPage, setPageSize, start, end, totalPages } = pager

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
      <div className="flex items-center gap-2">
        <span>
          {total === 0 ? 'No results' : `Showing ${start + 1}–${end} of ${total}`}
        </span>
        <label className="flex items-center gap-1">
          <span className="sr-only">{`${label} per page`}</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-1.5 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
            <option value={0}>Show all</option>
          </select>
        </label>
      </div>

      {pageSize !== 0 && totalPages > 1 && (
        <div className="flex items-center gap-1">
          <PagerBtn disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={14} /> Prev
          </PagerBtn>
          <span className="px-2 tabular-nums">
            {page} / {totalPages}
          </span>
          <PagerBtn disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight size={14} />
          </PagerBtn>
        </div>
      )}
    </div>
  )
}

function PagerBtn({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-0.5 rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  )
}
