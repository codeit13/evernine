import { scoreColor } from "@/lib/format"

// Full-circle health ring with the score in Geist Mono at the centre.
// Used on business cards and the Analyze result.
export function ScoreRing({
  score,
  size = 74,
  stroke = 7,
}: {
  score: number
  size?: number
  stroke?: number
}) {
  const r = (size - stroke) / 2
  const cx = size / 2
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(100, score)) / 100)
  const color = scoreColor(score)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: "stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)" }}
      />
      <text
        x={cx}
        y={cx + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.32}
        fontWeight={700}
        fill="hsl(var(--foreground))"
        fontFamily="'Geist Mono', monospace"
      >
        {Math.round(score)}
      </text>
    </svg>
  )
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r, a0)
  const [x1, y1] = polar(cx, cy, r, a1)
  const large = a1 - a0 > 180 ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
}

// 270° arc gauge for the business-detail "Overall health".
export function GaugeArc({ score }: { score: number }) {
  const S = 256, cx = 128, cy = 132, r = 98, sw = 17
  const start = 135, span = 270
  const val = start + span * (Math.max(0, Math.min(100, score)) / 100)
  const color = scoreColor(score)
  const [lx, ly] = polar(cx, cy, r + 2, 135)
  const [rx, ry] = polar(cx, cy, r + 2, 45)
  return (
    <svg width={S} height={S - 26} viewBox={`0 0 ${S} ${S - 14}`} style={{ display: "block" }}>
      <path d={arcPath(cx, cy, r, start, start + span)} fill="none" stroke="hsl(var(--muted))" strokeWidth={sw} strokeLinecap="round" />
      {score > 0 && (
        <path
          d={arcPath(cx, cy, r, start, val)}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          style={{ transition: "all .7s cubic-bezier(.22,1,.36,1)" }}
        />
      )}
      <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="central" fontSize={58} fontWeight={700} fill="hsl(var(--foreground))" fontFamily="'Geist Mono', monospace" letterSpacing="-2">
        {Math.round(score)}
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" fontSize={13} fill="hsl(var(--subtle))" fontFamily="'Geist Mono', monospace">
        / 100
      </text>
      <text x={lx - 4} y={ly + 6} textAnchor="middle" fontSize={11} fill="hsl(var(--subtle))" fontFamily="'Geist Mono', monospace">0</text>
      <text x={rx + 6} y={ry + 6} textAnchor="middle" fontSize={11} fill="hsl(var(--subtle))" fontFamily="'Geist Mono', monospace">100</text>
    </svg>
  )
}
