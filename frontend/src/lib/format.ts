// Presentation helpers — thresholds and colors mirror the Evernine design system.

// Discrete, theme-aware health color (matches the design: >=70 good, >=50 warn, else bad).
export function scoreColor(score: number): string {
  if (score >= 70) return "hsl(var(--success))"
  if (score >= 50) return "hsl(var(--warning))"
  return "hsl(var(--destructive))"
}

export function scoreBg(score: number): string {
  if (score >= 70) return "hsl(var(--success) / 0.12)"
  if (score >= 50) return "hsl(var(--warning) / 0.13)"
  return "hsl(var(--destructive) / 0.12)"
}

// Grade label: >=80 Strong, >=65 Healthy, >=50 Fair, else At risk.
export function grade(score: number): string {
  if (score >= 80) return "Strong"
  if (score >= 65) return "Healthy"
  if (score >= 50) return "Fair"
  return "At risk"
}

export type ConfTier = "High" | "Medium" | "Low"

// Backend confidence is 0..1; the UI shows it 0..100 with a tier + color.
export function confMeta(confidence01: number): { pct: number; tier: ConfTier; color: string; bg: string } {
  const pct = Math.round(confidence01 * 100)
  if (pct >= 60)
    return pct >= 80
      ? { pct, tier: "High", color: "hsl(var(--success))", bg: "hsl(var(--success) / 0.12)" }
      : { pct, tier: "Medium", color: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.13)" }
  return { pct, tier: "Low", color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.12)" }
}

// Map the backend's confidence_band string to a display tier/color as a fallback.
export function bandMeta(band: string): { tier: ConfTier; color: string; bg: string } {
  if (band === "high") return { tier: "High", color: "hsl(var(--success))", bg: "hsl(var(--success) / 0.12)" }
  if (band === "medium") return { tier: "Medium", color: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.13)" }
  return { tier: "Low", color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.12)" }
}

export const SIGNAL_LABELS: Record<string, string> = {
  revenue: "Revenue",
  reviews: "Reviews",
  loyalty_ops: "Loyalty & support",
  ad_efficiency: "Ad efficiency",
}

export const SIGNAL_DESC: Record<string, string> = {
  revenue: "Momentum & trend",
  reviews: "Rating & sentiment",
  loyalty_ops: "Repeat rate & support",
  ad_efficiency: "ROAS trend",
}

export const SIGNAL_ORDER = ["revenue", "reviews", "loyalty_ops", "ad_efficiency"]

export function signalLabel(key: string): string {
  return SIGNAL_LABELS[key] ?? key.replace(/_/g, " ")
}

export function signalShort(key: string): string {
  return { revenue: "Revenue", reviews: "Reviews", loyalty_ops: "Loyalty", ad_efficiency: "Ad eff." }[key] ?? key
}

export const FLAG_LABELS: Record<string, string> = {
  recent_revenue_shock: "Recent shock",
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
  const [y, m] = ym.split("-")
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const mi = parseInt(m, 10) - 1
  return `${months[mi] ?? m} '${y.slice(2)}`
}

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}
