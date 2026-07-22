import { confMeta, flagLabel } from "@/lib/format"
import { TriangleAlert } from "lucide-react"

// Confidence pill: colored dot + "{tier} conf" (matches the design cards).
export function ConfidenceBadge({
  confidence,
  suffix = "conf",
}: {
  confidence: number // 0..1
  suffix?: string
}) {
  const { tier, color, bg } = confMeta(confidence)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-semibold"
      style={{ color, background: bg }}
    >
      <span className="size-1.5 rounded-full" style={{ background: "currentColor" }} />
      {tier} {suffix}
    </span>
  )
}

// Verified-grounding badge (green, check-in-circle) — the trust signal.
export function GroundedBadge({ label = "Grounded · Verified" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
      style={{ color: "hsl(var(--success))", background: "hsl(var(--success) / 0.12)" }}
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
        <path d="M4.4 7.1 6.2 8.9 9.7 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  )
}

// Alert flags — subtle warning/critical pills.
export function FlagBadges({ flags, score }: { flags: string[]; score?: number }) {
  if (!flags || flags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((f) => {
        const critical = f === "recent_revenue_shock" || (score != null && score < 50)
        const color = critical ? "hsl(var(--destructive))" : "hsl(var(--warning))"
        const bg = critical ? "hsl(var(--destructive) / 0.1)" : "hsl(var(--warning) / 0.12)"
        return (
          <span
            key={f}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold"
            style={{ color, background: bg }}
          >
            <TriangleAlert className="size-3" />
            {flagLabel(f)}
          </span>
        )
      })}
    </div>
  )
}

// Compact alert indicator for card corners: triangle + count.
export function AlertCount({ count, score }: { count: number; score: number }) {
  if (!count) return null
  const color = score < 50 ? "hsl(var(--destructive))" : "hsl(var(--warning))"
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold" style={{ color }}>
      <TriangleAlert className="size-3" />
      {count}
    </span>
  )
}
