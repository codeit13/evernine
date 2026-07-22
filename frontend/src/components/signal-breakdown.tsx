import type { ScoreReport } from "@/lib/api"
import { SIGNAL_ORDER, signalLabel, scoreColor, fmtPct } from "@/lib/format"
import { SIGNAL_DESC } from "@/lib/format"

// Per-signal weighted breakdown bars (matches the design), with missing signals
// shown explicitly as excluded rather than scored zero.
export function SignalBreakdown({ report }: { report: ScoreReport }) {
  return (
    <div className="flex flex-col gap-[18px]">
      {SIGNAL_ORDER.map((key) => {
        const s = report.signals[key]
        if (!s) return null
        const label = signalLabel(key)

        if (!s.present) {
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="ml-2 text-xs text-subtle">no data — excluded</span>
                </div>
                <span className="font-mono text-[11px] text-subtle">weight {fmtPct(s.base_weight)}</span>
              </div>
              <div className="h-2 rounded-md border border-dashed bg-muted/40" />
            </div>
          )
        }

        const val = s.shrunk_subscore ?? 0
        const color = scoreColor(val)
        return (
          <div key={key}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <div>
                <span className="text-sm font-semibold">{label}</span>
                <span className="ml-2 text-xs text-subtle">{SIGNAL_DESC[key]}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[15px] font-semibold" style={{ color }}>{Math.round(val)}</span>
                <span className="font-mono text-[11px] text-subtle">weight {s.base_weight.toFixed(2)}</span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-md bg-muted">
              <div
                className="h-full rounded-md transition-[width] duration-700"
                style={{ width: `${val}%`, background: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
