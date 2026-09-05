// Layout-holding loading placeholders. Author: Piyush Kapoor.
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  )
}

export function SkeletonCards({ count = 4, height = 'h-56' }: { count?: number; height?: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${height} w-full`} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-slate-100 px-3 py-3 last:border-0 dark:border-slate-800/60">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 ${c === 0 ? 'w-40' : 'w-20'}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[74px] w-full" />
      ))}
    </div>
  )
}
