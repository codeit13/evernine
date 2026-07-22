import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChartTooltip } from "./chart-tooltip"
import { fmtMonth } from "@/lib/format"

interface TrendChartProps {
  series: Record<string, number>
  height?: number
  color?: string
  valueFormatter?: (v: number) => string
  highlightLast?: boolean
  yLabel?: string
}

export function TrendChart({
  series,
  height = 220,
  color = "hsl(var(--primary))",
  valueFormatter = (v) => v.toLocaleString(),
  highlightLast = false,
  yLabel,
}: TrendChartProps) {
  const months = Object.keys(series).sort()
  const data = months.map((m) => ({ month: m, value: series[m] }))
  const last = data[data.length - 1]
  const gradId = `grad-${Math.abs(hashStr(yLabel ?? color))}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickFormatter={fmtMonth}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(v) => valueFormatter(v as number)}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip
          content={
            <ChartTooltip
              labelFormatter={(l) => fmtMonth(l as string)}
              formatter={(v) => valueFormatter(v as number)}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          name={yLabel ?? "Value"}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradId})`}
          isAnimationActive
          dot={false}
          activeDot={{ r: 4 }}
        />
        {highlightLast && last && (
          <ReferenceDot
            x={last.month}
            y={last.value}
            r={5}
            fill="hsl(var(--destructive))"
            stroke="hsl(var(--background))"
            strokeWidth={2}
            isFront
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
  return h
}
