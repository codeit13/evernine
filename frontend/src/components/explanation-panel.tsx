import type { ScoreReport } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ShieldCheck, FileText } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// The AI-generated (or template) explanation, with a verifiable "grounded" badge
// backed by the backend's groundedness guard.
export function ExplanationPanel({ report }: { report: ScoreReport }) {
  const isLlm = report.explanation_source === "llm"
  const grounded = report.explanation_grounded
  const checked = report.groundedness?.checked_numbers ?? 0

  return (
    <div className="rounded-xl border bg-gradient-to-b from-accent/40 to-transparent p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-primary" />
          {isLlm ? "AI explanation" : "Explanation"}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant={isLlm ? "default" : "muted"}>
            {isLlm ? <Sparkles className="size-3" /> : <FileText className="size-3" />}
            {isLlm ? "Live model" : "Deterministic"}
          </Badge>
          {grounded && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Badge variant="success">
                      <ShieldCheck className="size-3" />
                      Grounded
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Every number in this explanation was automatically cross-checked against the
                  computed sub-scores{checked ? ` (${checked} values verified)` : ""}.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{report.explanation}</p>
    </div>
  )
}
