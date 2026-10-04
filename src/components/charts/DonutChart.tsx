export interface DonutSegment {
  label: string
  value: number
  colorClass: string
  dotClass: string
}

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Donut chart (SVG stroke-dasharray) with a legend -- e.g. complaints by priority. */
export function DonutChart({ segments }: { segments: DonutSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  if (total === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No data.</p>
  }

  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90">
        <circle cx="50" cy="50" r={RADIUS} className="fill-none stroke-slate-100 dark:stroke-slate-800" strokeWidth="14" />
        {segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const dash = (s.value / total) * CIRCUMFERENCE
            const circle = (
              <circle
                key={s.label}
                cx="50"
                cy="50"
                r={RADIUS}
                strokeWidth="14"
                fill="none"
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-offset}
                className={s.colorClass}
              >
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            )
            offset += dash
            return circle
          })}
      </svg>
      <ul className="space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${s.dotClass}`} />
            <span className="text-slate-700 dark:text-slate-300">{s.label}</span>
            <span className="text-slate-500 dark:text-slate-400">({s.value})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
