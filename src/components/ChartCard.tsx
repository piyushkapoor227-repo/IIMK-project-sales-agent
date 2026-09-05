// A dashboard chart tile: title + an ⓘ button that reveals a hidden description
// and the underlying numbers (the table-view twin). Author: Piyush Kapoor.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'

export interface ChartTable {
  columns: string[]
  rows: (string | number)[][]
}

export function ChartCard({
  title,
  description,
  table,
  children,
}: {
  title: string
  description: ReactNode
  table?: ChartTable
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div ref={ref} className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={`About “${title}”`}
          aria-expanded={open}
          aria-controls={panelId}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
            open
              ? 'bg-accent-600 text-white'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Info size={15} />
        </button>

        {open && (
          <div
            id={panelId}
            className="absolute right-0 top-8 z-30 w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            <p className="text-slate-600 dark:text-slate-300">{description}</p>
            {table && table.rows.length > 0 && (
              <div className="mt-2 max-h-48 overflow-auto border-t border-slate-200 pt-2 dark:border-slate-700">
                <table className="w-full text-left tabular-nums">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                      {table.columns.map((c) => (
                        <th key={c} className="py-1 pr-3 font-medium">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-700/60">
                        {r.map((cell, j) => (
                          <td key={j} className="py-1 pr-3 text-slate-600 dark:text-slate-300">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {children}
    </div>
  )
}
