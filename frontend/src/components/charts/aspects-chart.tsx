import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartTooltip } from "./chart-tooltip"
import { titleCase } from "@/lib/format"

type Aspects = Record<string, { pos: number; neg: number }>

export function AspectsChart({ aspects, height = 200 }: { aspects: Aspects; height?: number }) {
  const data = Object.entries(aspects || {}).map(([theme, c]) => ({
    theme: titleCase(theme),
    Positive: c.pos ?? 0,
    Negative: c.neg ?? 0,
  }))

  if (data.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
        No themes detected in review text.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="theme"
          width={84}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.5)" }} content={<ChartTooltip />} />
        <Bar dataKey="Positive" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} barSize={16} />
        <Bar dataKey="Negative" stackId="a" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}
