export interface BarChartPoint {
  label: string
  value: number
}

/** Simple vertical bar chart (SVG, no deps) for a short trend series. */
export function BarChart({ data, height = 160 }: { data: BarChartPoint[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const barWidth = 100 / data.length

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 4)
          return (
            <rect
              key={i}
              x={i * barWidth + barWidth * 0.15}
              y={height - barHeight}
              width={barWidth * 0.7}
              height={barHeight}
              rx={1}
              className="fill-brand"
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}
