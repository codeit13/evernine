import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api, type BusinessInput, type ScoreReport } from "@/lib/api"
import { GaugeArc } from "@/components/score-gauge"
import { SignalBreakdown } from "@/components/signal-breakdown"
import { GroundedBadge, FlagBadges } from "@/components/badges"
import { HealthRadar } from "@/components/charts/health-radar"
import { TrendChart } from "@/components/charts/trend-chart"
import { AspectsChart } from "@/components/charts/aspects-chart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  grade, scoreColor, scoreBg, confMeta, fmtMoney, signalLabel, SIGNAL_ORDER,
} from "@/lib/format"
import { ArrowLeft, Sparkles, Star } from "lucide-react"

function computeRoas(biz: BusinessInput): Record<string, number> {
  const out: Record<string, number> = {}
  for (const m of Object.keys(biz.revenue_by_month)) {
    const ad = biz.ad_spend_by_month[m]
    if (ad && ad > 0) out[m] = +(biz.revenue_by_month[m] / ad).toFixed(2)
  }
  return out
}

const CATEGORY_CHIP =
  "rounded-md border bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-subtle"

export default function BusinessDetail() {
  const { id = "" } = useParams()
  const [report, setReport] = useState<ScoreReport | null>(null)
  const [raw, setRaw] = useState<BusinessInput | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setReport(null); setRaw(null); setError(null)
    Promise.all([api.scoreOne(id, true), api.businessDetail(id)])
      .then(([r, b]) => { setReport(r); setRaw(b) })
      .catch((e) => setError(String(e)))
  }, [id])

  const roas = useMemo(() => (raw ? computeRoas(raw) : {}), [raw])

  const chips = useMemo(() => {
    if (!report) return []
    const present = Object.entries(report.signals).filter(([, s]) => s.present)
    present.sort((a, b) => (b[1].shrunk_subscore ?? 0) - (a[1].shrunk_subscore ?? 0))
    const out: string[] = []
    if (present[0]) out.push(`${signalLabel(present[0][0])} ${Math.round(present[0][1].shrunk_subscore ?? 0)}`)
    const last = present[present.length - 1]
    if (last && last !== present[0]) out.push(`${signalLabel(last[0])} ${Math.round(last[1].shrunk_subscore ?? 0)}`)
    out.push(`coverage ${Math.round(report.coverage * 100)}%`)
    return out
  }, [report])

  if (error)
    return (
      <Wrap>
        <BackLink />
        <div className="rounded-2xl border border-destructive/40 p-6 text-sm text-destructive">{error}</div>
      </Wrap>
    )
  if (!report)
    return (
      <Wrap>
        <BackLink />
        <div className="grid gap-4" style={{ gridTemplateColumns: "340px 1fr" }}>
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </Wrap>
    )

  const score = report.composite_score
  const cm = confMeta(report.overall_confidence)
  const reviews = report.signals.reviews
  const aspects = (reviews?.drivers?.aspects ?? {}) as Record<string, { pos: number; neg: number }>
  const lastRev = report.signals.revenue?.drivers?.last_revenue as number | undefined

  return (
    <Wrap>
      <BackLink />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-semibold tracking-tight">{report.business_name}</h1>
            {report.category && <span className={CATEGORY_CHIP}>{report.category}</span>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Composite health from revenue, reviews, loyalty &amp; support, and ad efficiency.
          </p>
        </div>
        <div className="flex gap-2.5">
          <StatBox label="Confidence" value={<span style={{ color: cm.color }}>{cm.pct}<span className="text-xs text-subtle"> · {cm.tier}</span></span>} />
          <StatBox label="Data coverage" value={`${Math.round(report.coverage * 100)}%`} />
        </div>
      </div>

      {report.flags.length > 0 && (
        <div className="mb-4"><FlagBadges flags={report.flags} score={score} /></div>
      )}

      {/* Row 1: gauge + AI explanation */}
      <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: "minmax(300px,340px) 1fr" }}>
        <Card className="flex flex-col items-center">
          <div className="self-start text-xs font-semibold uppercase tracking-wide text-subtle">Overall health</div>
          <div className="my-1"><GaugeArc score={score} /></div>
          <div className="inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-1.5 text-sm font-semibold" style={{ color: scoreColor(score), background: scoreBg(score) }}>
            {grade(score)}
          </div>
          {lastRev != null && (
            <div className="mt-5 flex w-full items-center justify-between border-t pt-4 text-[12.5px]">
              <span className="text-subtle">Monthly revenue</span>
              <span className="font-mono font-semibold">{fmtMoney(lastRev)}</span>
            </div>
          )}
        </Card>

        <Card className="flex flex-col">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-[17px] text-primary" />
              <h2 className="text-[15px] font-semibold">AI explanation</h2>
            </div>
            {report.explanation_grounded && <GroundedBadge />}
          </div>
          <p className="text-[14.5px] leading-relaxed text-foreground" style={{ textWrap: "pretty" as any }}>
            {report.explanation}
          </p>
          {chips.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-2 border-t pt-3.5">
              {chips.map((c, i) => (
                <span key={i} className="rounded-md border bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground">{c}</span>
              ))}
            </div>
          )}
          <div className="mt-auto pt-3.5 text-[11.5px] leading-relaxed text-subtle">
            Generated only from the four verified signals above — every number is cross-checked against the computed sub-scores.
          </div>
        </Card>
      </div>

      {/* Row 2: radar + breakdown */}
      <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: "minmax(300px,340px) 1fr" }}>
        <Card>
          <h2 className="mb-1.5 text-[15px] font-semibold">Signal balance</h2>
          <p className="mb-2 text-[12.5px] text-muted-foreground">Four signals, confidence-weighted</p>
          <div className="flex justify-center"><HealthRadar report={report} height={232} /></div>
        </Card>
        <Card>
          <h2 className="mb-4 text-[15px] font-semibold">Signal breakdown</h2>
          <SignalBreakdown report={report} />
        </Card>
      </div>

      {/* Row 3: trends */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Revenue trend</h2>
            <span className="font-mono text-xs text-subtle">monthly</span>
          </div>
          {report.flags.includes("recent_revenue_shock") && (
            <div className="mb-1.5 flex items-center gap-2 text-xs text-destructive">
              <span className="size-2 rounded-full bg-destructive" /> Recent shock flagged
            </div>
          )}
          {raw && Object.keys(raw.revenue_by_month).length > 0
            ? <TrendChart series={raw.revenue_by_month} valueFormatter={fmtMoney} highlightLast={report.flags.includes("recent_revenue_shock")} yLabel="Revenue" />
            : <Empty />}
        </Card>
        <Card>
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">ROAS trend</h2>
            <span className="font-mono text-xs text-subtle">return on ad spend</span>
          </div>
          {Object.keys(roas).length > 0
            ? <TrendChart series={roas} color="hsl(var(--primary))" valueFormatter={(v) => `${v.toFixed(1)}x`} yLabel="ROAS" />
            : <Empty />}
        </Card>
      </div>

      {/* Reviews */}
      {reviews?.present && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-1.5 text-[15px] font-semibold">Review themes</h2>
            <p className="mb-2 text-[12.5px] text-muted-foreground">
              From {reviews.drivers?.n_reviews as number} reviews · {reviews.drivers?.sentiment_backend as string} sentiment
            </p>
            <AspectsChart aspects={aspects} />
          </Card>
          <Card>
            <h2 className="mb-3 text-[15px] font-semibold">Recent reviews</h2>
            <div className="space-y-2">
              {(raw?.customer_reviews ?? []).slice(0, 6).map((rev, i) => (
                <div key={i} className="flex gap-3 rounded-xl border p-2.5">
                  <div className="flex shrink-0 items-center gap-0.5 font-mono text-sm font-semibold" style={{ color: scoreColor(((rev.rating ?? 3) / 5) * 100) }}>
                    {rev.rating ?? "—"}<Star className="size-3 fill-current" />
                  </div>
                  <p className="text-[13px] text-muted-foreground">{rev.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </Wrap>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-[1180px] animate-fade-in px-[26px] pb-[72px] pt-[26px]">{children}</main>
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border bg-card p-[22px] shadow-sm ${className}`}>{children}</div>
}
function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-2.5 text-right">
      <div className="text-[11px] font-medium uppercase tracking-wide text-subtle">{label}</div>
      <div className="mt-0.5 font-mono text-[19px] font-semibold">{value}</div>
    </div>
  )
}
function BackLink() {
  return (
    <Link to="/" className="mb-5 inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      <ArrowLeft className="size-3.5" /> Portfolio
    </Link>
  )
}
function Empty() {
  return <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">No data available.</div>
}
