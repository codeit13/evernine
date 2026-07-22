import type { ScoreReport } from "@/lib/api"
import { GroundedBadge } from "@/components/badges"
import { Sparkles } from "lucide-react"

// AI explanation card (used on the Analyze results). Matches the design.
export function ExplanationPanel({ report }: { report: ScoreReport }) {
  return (
    <div className="rounded-2xl border bg-card p-[22px] shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">AI explanation</h3>
        </div>
        {report.explanation_grounded && <GroundedBadge label="Grounded" />}
      </div>
      <p className="text-sm leading-relaxed text-foreground" style={{ textWrap: "pretty" as any }}>
        {report.explanation}
      </p>
    </div>
  )
}
