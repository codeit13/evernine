import type { ScoreReport } from "@/lib/api"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { SIGNAL_ORDER, signalLabel, scoreColor, fmtPct } from "@/lib/format"
import { ArrowRight } from "lucide-react"

// Per-signal breakdown: the heart of the explainability story.
// Shows each signal's shrunk sub-score, how far it was pulled from the raw
// value by low confidence, its confidence, and its weight -- and clearly marks
// signals that were excluded for lack of data.
export function SignalBreakdown({ report }: { report: ScoreReport }) {
  return (
    <div className="space-y-4">
      {SIGNAL_ORDER.map((key) => {
        const s = report.signals[key]
        if (!s) return null
        const label = signalLabel(key)

        if (!s.present) {
          return (
            <div key={key} className="rounded-lg border border-dashed p-3.5 opacity-90">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{label}</span>
                <Badge variant="muted">No data · excluded</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Would carry {fmtPct(s.base_weight)} weight when present. Excluded from the
                composite (not scored as zero); lowers overall confidence.
              </p>
            </div>
          )
        }

        const shrunk = s.shrunk_subscore ?? 0
        const raw = s.subscore ?? 0
        const pulled = Math.abs(raw - shrunk) >= 1.5
        const color = scoreColor(shrunk)

        return (
          <div key={key} className="rounded-lg border p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">{label}</span>
              <div className="flex items-center gap-2 tabular-nums">
                {pulled && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {raw.toFixed(0)}
                    <ArrowRight className="size-3" />
                  </span>
                )}
                <span className="text-lg font-semibold" style={{ color }}>
                  {shrunk.toFixed(0)}
                </span>
              </div>
            </div>

            <Progress value={shrunk} indicatorColor={color} className="mt-2" />

            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Confidence <ConfidencePill value={s.confidence} />
              </span>
              <span>Weight {fmtPct(s.base_weight)}</span>
            </div>

            {pulled && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Pulled from {raw.toFixed(0)} toward the {s.prior?.toFixed(0)} prior — thin/uncertain
                data.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function ConfidencePill({ value }: { value: number }) {
  const variant = value >= 0.6 ? "success" : value >= 0.35 ? "warning" : "destructive"
  return (
    <Badge variant={variant as any} className="ml-1 px-1.5 py-0 text-[10px]">
      {value.toFixed(2)}
    </Badge>
  )
}
