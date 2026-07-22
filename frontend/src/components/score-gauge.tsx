import { scoreBand, scoreColor, bandLabel } from "@/lib/format"

interface ScoreGaugeProps {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
  showBand?: boolean
}

// A circular progress ring with the score in the centre.
export function ScoreGauge({
  score,
  size = 180,
  strokeWidth = 14,
  label = "Health score",
  showBand = true,
}: ScoreGaugeProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, score)) / 100
  const dash = circumference * pct
  const color = scoreColor(score)
  const band = scoreBand(score)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tabular-nums tracking-tight" style={{ color }}>
          {score.toFixed(0)}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {showBand && (
          <span className="mt-1 text-xs font-semibold" style={{ color }}>
            {bandLabel[band]}
          </span>
        )}
      </div>
    </div>
  )
}
