// Dependency-free chart primitives (HTML/CSS + a little SVG) for the team
// dashboard. Colors come from the validated --chart-* CSS variables in
// index.css; only marks carry the series hue — all text uses ink tokens.
// Author: Piyush Kapoor.
import { useState, type ReactNode } from 'react'

// ---- hover tooltip ----------------------------------------------------------

interface TipState {
  x: number
  y: number
  content: ReactNode
}

function useHoverTip() {
  const [tip, setTip] = useState<TipState | null>(null)
  const show = (e: { clientX: number; clientY: number }, content: ReactNode) =>
    setTip({ x: e.clientX, y: e.clientY, content })
  const hide = () => setTip(null)
  const node = tip ? (
    <div
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      {tip.content}
    </div>
  ) : null
  return { show, hide, node }
}

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
const fmtMoney = (n: number) => `₹${n.toFixed(2)}`

export interface Datum {
  label: string
  value: number
}

// ---- single-series column chart (trend over time) -------------------------

export function ColumnChart({
  data,
  unit = '',
  height = 150,
}: {
  data: Datum[]
  unit?: string
  height?: number
}) {
  const { show, hide, node } = useHoverTip()
  const max = Math.max(1, ...data.map((d) => d.value))
  const labelEvery = data.length > 10 ? Math.ceil(data.length / 7) : 1

  return (
    <div>
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={i}
            className="flex h-full flex-1 cursor-default flex-col justify-end"
            onMouseEnter={(e) => show(e, `${d.label}: ${fmtNum(d.value)}${unit ? ` ${unit}` : ''}`)}
            onMouseMove={(e) => show(e, `${d.label}: ${fmtNum(d.value)}${unit ? ` ${unit}` : ''}`)}
            onMouseLeave={hide}
          >
            <div
              className="w-full rounded-t-[4px]"
              style={{
                height: `${(d.value / max) * 100}%`,
                minHeight: d.value > 0 ? 2 : 0,
                background: 'var(--chart-s1)',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 overflow-hidden text-center text-[10px] whitespace-nowrap text-[color:var(--chart-muted)]"
          >
            {i % labelEvery === 0 ? d.label : ''}
          </div>
        ))}
      </div>
      {node}
    </div>
  )
}

// ---- single-series horizontal bars (magnitude by identity) ----------------

export function HBarChart({
  data,
  unit = '',
  labelWidth = 96,
  onSelect,
}: {
  data: Datum[]
  unit?: string
  labelWidth?: number
  onSelect?: (d: Datum, index: number) => void
}) {
  const { show, hide, node } = useHoverTip()
  const max = Math.max(1, ...data.map((d) => d.value))

  if (data.length === 0) return <Empty />

  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div
          key={i}
          onClick={onSelect ? () => onSelect(d, i) : undefined}
          className={`flex items-center gap-2 text-xs ${onSelect ? 'cursor-pointer rounded hover:bg-slate-50 dark:hover:bg-slate-800/60' : 'cursor-default'}`}
          onMouseEnter={(e) => show(e, `${d.label}: ${fmtNum(d.value)}${unit ? ` ${unit}` : ''}`)}
          onMouseMove={(e) => show(e, `${d.label}: ${fmtNum(d.value)}${unit ? ` ${unit}` : ''}`)}
          onMouseLeave={hide}
        >
          <span
            className="shrink-0 truncate text-right text-[color:var(--chart-ink)]"
            style={{ width: labelWidth }}
            title={d.label}
          >
            {d.label}
          </span>
          <div className="flex flex-1 items-center gap-1.5">
            <div
              className="h-3 rounded-r-[4px]"
              style={{
                width: `${Math.max((d.value / max) * 100, d.value > 0 ? 1.5 : 0)}%`,
                background: 'var(--chart-s1)',
              }}
            />
            <span className="tabular-nums text-[color:var(--chart-ink)]">{fmtNum(d.value)}</span>
          </div>
        </div>
      ))}
      {node}
    </div>
  )
}

// ---- two-series grouped columns (opened vs resolved over time) ------------

export function GroupedColumnChart({
  groups,
  series,
}: {
  groups: { label: string; values: [number, number] }[]
  series: [string, string]
}) {
  const { show, hide, node } = useHoverTip()
  const max = Math.max(1, ...groups.flatMap((g) => g.values))

  return (
    <div>
      <Legend items={[[series[0], 'var(--chart-s1)'], [series[1], 'var(--chart-s2)']]} />
      <div className="flex items-end gap-2" style={{ height: 140 }}>
        {groups.map((g, i) => (
          <div key={i} className="flex h-full flex-1 items-end justify-center gap-[2px]">
            {g.values.map((v, s) => (
              <div
                key={s}
                className="w-1/2 cursor-default rounded-t-[4px]"
                style={{
                  height: `${(v / max) * 100}%`,
                  minHeight: v > 0 ? 2 : 0,
                  maxWidth: 22,
                  background: s === 0 ? 'var(--chart-s1)' : 'var(--chart-s2)',
                }}
                onMouseEnter={(e) => show(e, `${g.label} · ${series[s]}: ${fmtNum(v)}`)}
                onMouseMove={(e) => show(e, `${g.label} · ${series[s]}: ${fmtNum(v)}`)}
                onMouseLeave={hide}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        {groups.map((g, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-[color:var(--chart-muted)]">
            {g.label}
          </div>
        ))}
      </div>
      {node}
    </div>
  )
}

// ---- two-series grouped horizontal bars (price vs competitor) ------------

export function PriceCompareChart({
  rows,
  series,
}: {
  rows: { label: string; ours: number | null; competitor: number | null }[]
  series: [string, string]
}) {
  const { show, hide, node } = useHoverTip()
  const max = Math.max(
    1,
    ...rows.flatMap((r) => [r.ours ?? 0, r.competitor ?? 0]),
  )
  if (rows.length === 0) return <Empty />

  return (
    <div className="space-y-3">
      <Legend items={[[series[0], 'var(--chart-s1)'], [series[1], 'var(--chart-s2)']]} />
      {rows.map((r, i) => (
        <div key={i} className="text-xs">
          <div className="mb-1 truncate text-[color:var(--chart-ink)]" title={r.label}>
            {r.label}
          </div>
          {([['ours', r.ours, 'var(--chart-s1)'], ['competitor', r.competitor, 'var(--chart-s2)']] as const).map(
            ([key, val, color]) => (
              <div
                key={key}
                className="flex cursor-default items-center gap-1.5 py-[1px]"
                onMouseEnter={(e) => show(e, `${r.label} · ${key === 'ours' ? series[0] : series[1]}: ${val == null ? 'n/a' : fmtMoney(val)}`)}
                onMouseMove={(e) => show(e, `${r.label} · ${key === 'ours' ? series[0] : series[1]}: ${val == null ? 'n/a' : fmtMoney(val)}`)}
                onMouseLeave={hide}
              >
                <div
                  className="h-2.5 rounded-r-[4px]"
                  style={{ width: `${((val ?? 0) / max) * 100}%`, minWidth: val ? 2 : 0, background: color }}
                />
                <span className="tabular-nums text-[color:var(--chart-muted)]">
                  {val == null ? '—' : fmtMoney(val)}
                </span>
              </div>
            ),
          )}
        </div>
      ))}
      {node}
    </div>
  )
}

// ---- donut (part-to-whole, status) --------------------------------------

export function DonutChart({
  segments,
  onSelect,
}: {
  segments: { label: string; value: number; color: string }[]
  onSelect?: (label: string) => void
}) {
  const { show, hide, node } = useHoverTip()
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total === 0) return <Empty />

  const r = 60
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 160 160" className="h-32 w-32 shrink-0 -rotate-90">
        {segments.map((seg, i) => {
          const frac = seg.value / total
          const dash = frac * c
          const el = (
            <circle
              key={i}
              cx={80}
              cy={80}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={18}
              strokeDasharray={`${Math.max(dash - 2, 0)} ${c - Math.max(dash - 2, 0)}`}
              strokeDashoffset={-offset}
              className={onSelect ? 'cursor-pointer' : 'cursor-default'}
              onClick={onSelect ? () => onSelect(seg.label) : undefined}
              onMouseEnter={(e) => show(e, `${seg.label}: ${seg.value} (${Math.round(frac * 100)}%)`)}
              onMouseMove={(e) => show(e, `${seg.label}: ${seg.value} (${Math.round(frac * 100)}%)`)}
              onMouseLeave={hide}
            />
          )
          offset += dash
          return el
        })}
        <text
          x={80}
          y={80}
          className="fill-[color:var(--chart-ink)] text-2xl font-semibold"
          textAnchor="middle"
          dominantBaseline="central"
          transform="rotate(90 80 80)"
        >
          {total}
        </text>
      </svg>
      <ul className="space-y-1.5 text-xs">
        {segments.map((seg, i) => (
          <li
            key={i}
            onClick={onSelect ? () => onSelect(seg.label) : undefined}
            className={`flex items-center gap-2 text-[color:var(--chart-ink)] ${
              onSelect ? 'cursor-pointer rounded hover:underline' : ''
            }`}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: seg.color }} />
            {seg.label}
            <span className="tabular-nums text-[color:var(--chart-muted)]">{seg.value}</span>
          </li>
        ))}
      </ul>
      {node}
    </div>
  )
}

// ---- shared bits ---------------------------------------------------------

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-[color:var(--chart-ink)]">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  )
}

function Empty() {
  return <p className="py-8 text-center text-sm text-slate-400">Not enough data yet.</p>
}
