import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts"
import type { ScoreReport } from "@/lib/api"
import { SIGNAL_ORDER, signalLabel } from "@/lib/format"

export function HealthRadar({ report, height = 260 }: { report: ScoreReport; height?: number }) {
  const data = SIGNAL_ORDER.map((key) => {
    const s = report.signals[key]
    return {
      signal: signalLabel(key),
      value: s?.present ? (s.shrunk_subscore ?? 0) : 0,
      present: s?.present ?? false,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="signal"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="Score"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.25}
          strokeWidth={2}
          isAnimationActive
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
