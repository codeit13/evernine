import { Link } from "react-router-dom"
import type { ScoreReport } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { ScoreGauge } from "@/components/score-gauge"
import { ConfidenceBadge, FlagBadges } from "@/components/badges"
import { fmtPct } from "@/lib/format"
import { ChevronRight } from "lucide-react"

export function BusinessCard({ report }: { report: ScoreReport }) {
  return (
    <Link to={`/business/${report.business_id}`} className="group block">
      <Card className="h-full p-5 transition-all hover:border-primary/40 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold tracking-tight">{report.business_name}</h3>
            <p className="text-xs text-muted-foreground">{report.category ?? "—"}</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>

        <div className="mt-3 flex items-center gap-4">
          <ScoreGauge score={report.composite_score} size={104} strokeWidth={9} label="Score" />
          <div className="flex flex-1 flex-col gap-2">
            <ConfidenceBadge band={report.confidence_band} />
            <div className="text-xs text-muted-foreground">
              Data coverage <span className="font-medium text-foreground">{fmtPct(report.coverage)}</span>
            </div>
          </div>
        </div>

        {report.flags.length > 0 && (
          <div className="mt-3">
            <FlagBadges flags={report.flags} />
          </div>
        )}
      </Card>
    </Link>
  )
}
