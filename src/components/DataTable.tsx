import type { ReactNode } from 'react'

export interface DataTableColumn<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
  highlight?: (row: T) => boolean
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  emptyLabel?: string
  onRowClick?: (row: T) => void
  isRowActive?: (row: T) => boolean
}

function cellValue<T>(row: T, column: DataTableColumn<T>): ReactNode {
  if (column.render) return column.render(row)
  const value = (row as Record<string, unknown>)[column.key]
  return value == null ? '' : String(value)
}

/**
 * Renders a real <table> at md+ and a stacked card list below it, so data never
 * requires horizontal scrolling on a phone-width screen.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyLabel = 'None.',
  onRowClick,
  isRowActive,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>
  }

  return (
    <div className="overflow-hidden rounded-control border border-slate-200 dark:border-slate-800">
      <table className="hidden w-full text-left text-sm md:table">
        <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-t border-slate-200 dark:border-slate-800 ${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900' : ''} ${
                isRowActive?.(row) ? 'bg-slate-100 dark:bg-slate-900' : 'bg-white dark:bg-slate-950'
              }`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 ${
                    c.highlight?.(row)
                      ? 'font-medium text-red-600 dark:text-red-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {cellValue(row, c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950 md:hidden">
        {rows.map((row) => (
          <li
            key={getRowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`px-3 py-3 ${onRowClick ? 'cursor-pointer' : ''} ${isRowActive?.(row) ? 'bg-slate-100 dark:bg-slate-900' : ''}`}
          >
            {columns.map((c, i) => (
              <div
                key={c.key}
                className={i === 0 ? 'mb-1 font-medium text-slate-900 dark:text-white' : 'flex items-baseline justify-between gap-3 text-xs'}
              >
                {i > 0 && <span className="text-slate-500 dark:text-slate-400">{c.label}</span>}
                <span className={c.highlight?.(row) ? 'font-medium text-red-600 dark:text-red-400' : i > 0 ? 'text-slate-700 dark:text-slate-300' : ''}>
                  {cellValue(row, c)}
                </span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  )
}
