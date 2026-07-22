// Presentation helpers: score bands, colors, labels, number formatting.

export type Band = "strong" | "moderate" | "mixed" | "weak"

export function scoreBand(score: number): Band {
  if (score >= 70) return "strong"
  if (score >= 55) return "moderate"
  if (score >= 40) return "mixed"
  return "weak"
}

// Returns an HSL color string for a score, interpolating red -> amber -> green.
export function scoreColor(score: number): string {
  // hue 0 (red) at 15, ~45 (amber) at 50, ~150 (green) at 85+
  const clamped = Math.max(0, Math.min(100, score))
  const hue = Math.round((clamped / 100) * 145) // 0..145
  return `hsl(${hue} 68% 45%)`
}

export const bandLabel: Record<Band, string> = {
  strong: "Strong",
  moderate: "Moderate",
  mixed: "Mixed",
  weak: "At risk",
}

export function confidenceLabel(band: string): string {
  return band.charAt(0).toUpperCase() + band.slice(1)
}

export const SIGNAL_LABELS: Record<string, string> = {
  revenue: "Revenue",
  reviews: "Reviews",
  loyalty_ops: "Loyalty & Ops",
  ad_efficiency: "Ad Efficiency",
}

export const SIGNAL_ORDER = ["revenue", "loyalty_ops", "reviews", "ad_efficiency"]

export function signalLabel(key: string): string {
  return SIGNAL_LABELS[key] ?? key.replace(/_/g, " ")
}

export const FLAG_LABELS: Record<string, string> = {
  recent_revenue_shock: "Recent revenue shock",
  low_confidence: "Low confidence",
  mostly_single_signal: "Sparse data",
  single_signal_only: "Single signal",
  no_signals_present: "No data",
}

export function flagLabel(flag: string): string {
  return FLAG_LABELS[flag] ?? flag.replace(/_/g, " ")
}

export function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${n.toFixed(0)}`
}

export function fmtPct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`
}

export function fmtMonth(ym: string): string {
  // "2026-06" -> "Jun '26"
  const [y, m] = ym.split("-")
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const mi = parseInt(m, 10) - 1
  return `${months[mi] ?? m} '${y.slice(2)}`
}

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}
