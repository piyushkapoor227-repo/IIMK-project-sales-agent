export interface HorizontalBarItem {
  label: string
  value: number
}

/** Ranked horizontal bar list (SVG-free, pure flex/width%) -- e.g. "Visits by rep". */
export function HorizontalBarChart({ items, formatValue }: { items: HorizontalBarItem[]; formatValue?: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value))

  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No data.</p>
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 truncate text-slate-700 dark:text-slate-300">{item.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
            {formatValue ? formatValue(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
