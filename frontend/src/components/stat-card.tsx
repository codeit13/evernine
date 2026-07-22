import type { ReactNode } from "react"

// KPI card matching the design: uppercase label + icon, big Geist Mono value
// (optionally colored), unit, and a sub caption.
export function StatCard({
  label,
  value,
  unit,
  sub,
  icon,
  color,
}: {
  label: string
  value: ReactNode
  unit?: string
  sub?: ReactNode
  icon?: ReactNode
  color?: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-[18px] shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-subtle">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className="font-mono text-[32px] font-semibold leading-none tracking-tight"
          style={color ? { color } : undefined}
        >
          {value}
        </span>
        {unit && <span className="font-mono text-sm text-subtle">{unit}</span>}
      </div>
      {sub && <div className="mt-2.5 text-[12.5px] text-muted-foreground">{sub}</div>}
    </div>
  )
}
