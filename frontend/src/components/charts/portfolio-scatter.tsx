import { useNavigate } from "react-router-dom"
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts"
import type { ScoreReport } from "@/lib/api"
import { scoreColor } from "@/lib/format"

// Portfolio matrix: composite health (y) vs. overall confidence (x).
// Top-right = confidently healthy; top-left = looks good but we're unsure;
// bottom = needs attention. Bubble size encodes data coverage.
export function PortfolioScatter({ reports, height = 320 }: { reports: ScoreReport[]; height?: number }) {
  const navigate = useNavigate()
  const data = reports.map((r) => ({
    x: r.overall_confidence,
    y: r.composite_score,
    z: r.coverage,
    name: r.business_name,
    id: r.business_id,
    color: scoreColor(r.composite_score),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 12, right: 20, bottom: 28, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name="Confidence"
          domain={[0, 1]}
          tickFormatter={(v) => `${Math.round((v as number) * 100)}%`}
          tickLine={false}
          axisLine={false}
          label={{ value: "Confidence →", position: "bottom", offset: 10, fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Health"
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          label={{ value: "Health →", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <ZAxis type="number" dataKey="z" range={[80, 380]} name="Coverage" />
        <ReferenceLine y={55} stroke="hsl(var(--border))" strokeDasharray="4 4" />
        <ReferenceLine x={0.5} stroke="hsl(var(--border))" strokeDasharray="4 4" />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null
            const p = payload[0].payload
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                <div className="font-medium">{p.name}</div>
                <div className="mt-1 text-muted-foreground">
                  Health <span className="font-medium text-foreground">{p.y.toFixed(0)}</span> ·
                  Confidence <span className="font-medium text-foreground">{Math.round(p.x * 100)}%</span> ·
                  Coverage <span className="font-medium text-foreground">{Math.round(p.z * 100)}%</span>
                </div>
              </div>
            )
          }}
        />
        <Scatter
          data={data}
          onClick={(d: any) => d?.id && navigate(`/business/${d.id}`)}
          className="cursor-pointer"
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} fillOpacity={0.8} stroke={d.color} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}
