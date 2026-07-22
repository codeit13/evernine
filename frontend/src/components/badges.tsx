import type { ScoreReport } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { confidenceLabel, flagLabel } from "@/lib/format"
import { AlertTriangle, Gauge, TriangleAlert } from "lucide-react"

export function ConfidenceBadge({ band }: { band: string }) {
  const variant = band === "high" ? "success" : band === "medium" ? "warning" : "destructive"
  return (
    <Badge variant={variant as any}>
      <Gauge className="size-3" />
      {confidenceLabel(band)} confidence
    </Badge>
  )
}

export function FlagBadges({ flags }: { flags: string[] }) {
  if (!flags || flags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((f) => {
        const critical = f === "recent_revenue_shock"
        return (
          <Badge key={f} variant={critical ? "destructive" : "warning"}>
            {critical ? <TriangleAlert className="size-3" /> : <AlertTriangle className="size-3" />}
            {flagLabel(f)}
          </Badge>
        )
      })}
    </div>
  )
}

export function coverageVariant(report: ScoreReport) {
  return report.coverage >= 0.75 ? "success" : report.coverage >= 0.5 ? "warning" : "destructive"
}
