import { Link } from "react-router-dom"
import type { ScoreReport } from "@/lib/api"
import { ScoreRing } from "@/components/score-gauge"
import { ConfidenceBadge, AlertCount } from "@/components/badges"
import { grade, scoreColor, fmtMoney } from "@/lib/format"

export function BusinessCard({ report }: { report: ScoreReport }) {
  const rev = report.signals.revenue?.drivers?.last_revenue as number | undefined
  const g = grade(report.composite_score)
  const color = scoreColor(report.composite_score)
  const alerts = report.flags.length

  return (
    <Link to={`/business/${report.business_id}`} className="group block">
      <div className="h-full rounded-2xl border bg-card p-[18px] shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-[hsl(var(--input))] hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="rounded-md border bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-subtle">
            {report.category ?? "—"}
          </span>
          <AlertCount count={alerts} score={report.composite_score} />
        </div>

        <div className="mt-4 flex items-center gap-4">
          <ScoreRing score={report.composite_score} size={74} stroke={7} />
          <div className="min-w-0">
            <div className="truncate text-[15.5px] font-semibold tracking-tight">{report.business_name}</div>
            <div className="mt-0.5 text-[12.5px] font-semibold" style={{ color }}>
              {g}
            </div>
            <div className="mt-0.5 font-mono text-xs text-subtle">
              {rev != null ? `${fmtMoney(rev)}/mo` : `${Math.round(report.coverage * 100)}% data`}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t pt-3.5">
          <ConfidenceBadge confidence={report.overall_confidence} />
          <span className="ml-auto font-mono text-[11.5px] text-subtle">
            {Math.round(report.coverage * 100)}% data
          </span>
        </div>
      </div>
    </Link>
  )
}
