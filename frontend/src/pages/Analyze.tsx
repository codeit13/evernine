import { useEffect, useMemo, useRef, useState } from "react"
import { api, type BusinessInput, type BusinessSummary, type ScoreReport } from "@/lib/api"
import { ScoreRing } from "@/components/score-gauge"
import { ExplanationPanel } from "@/components/explanation-panel"
import { SignalBreakdown } from "@/components/signal-breakdown"
import { TrendChart } from "@/components/charts/trend-chart"
import { AspectsChart } from "@/components/charts/aspects-chart"
import { ConfidenceBadge, FlagBadges } from "@/components/badges"
import { Skeleton } from "@/components/ui/skeleton"
import { EXAMPLES } from "@/lib/examples"
import { grade, scoreColor, scoreBg, confMeta, fmtMoney } from "@/lib/format"
import { Upload, ArrowRight, CircleAlert, Activity } from "lucide-react"

function computeRoas(biz: BusinessInput): Record<string, number> {
  const out: Record<string, number> = {}
  for (const m of Object.keys(biz.revenue_by_month || {})) {
    const ad = biz.ad_spend_by_month?.[m]
    if (ad && ad > 0) out[m] = +(biz.revenue_by_month[m] / ad).toFixed(2)
  }
  return out
}

export default function Analyze() {
  const [text, setText] = useState(() => JSON.stringify(EXAMPLES.healthy, null, 2))
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([])
  const [report, setReport] = useState<ScoreReport | null>(null)
  const [submitted, setSubmitted] = useState<BusinessInput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { api.businesses().then(setBusinesses).catch(() => {}) }, [])

  const roas = useMemo(() => (submitted ? computeRoas(submitted) : {}), [submitted])
  const aspects = (report?.signals.reviews?.drivers?.aspects ?? {}) as Record<string, { pos: number; neg: number }>

  async function loadExisting(id: string) {
    if (!id) return
    try { setText(JSON.stringify(await api.businessDetail(id), null, 2)); setError(null) }
    catch (e) { setError(String(e)) }
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = () => { setText(String(reader.result)); setError(null) }
    reader.readAsText(f)
  }
  async function score() {
    setError(null)
    let payload: BusinessInput
    try { payload = JSON.parse(text) }
    catch (e) { setError(`Invalid JSON: ${(e as Error).message}`); return }
    if (!payload.business_name) { setError("Needs at least a business_name and revenue_by_month."); return }
    setLoading(true)
    try { const r = await api.scorePayload(payload, true); setReport(r); setSubmitted(payload) }
    catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }

  return (
    <main className="mx-auto max-w-[1240px] animate-fade-in px-[26px] pb-[72px] pt-[34px]">
      <div className="mb-[22px]">
        <h1 className="text-[25px] font-semibold tracking-tight">Analyze a business</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Paste a business profile as JSON or upload a file. Evernine scores it live from the same four grounded signals — nothing is inferred beyond the numbers you provide.
        </p>
      </div>

      <div className="grid items-start gap-[18px] lg:grid-cols-2">
        {/* Editor */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-[18px] py-3.5">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold">
              <span className="size-2.5 rounded-sm bg-primary" /> business.json
            </div>
            <div className="flex gap-2">
              <select
                defaultValue=""
                onChange={(e) => loadExisting(e.target.value)}
                className="rounded-md border bg-secondary px-2.5 py-1.5 text-xs font-medium text-muted-foreground"
              >
                <option value="" disabled>Load sample…</option>
                {businesses.map((b) => <option key={b.business_id} value={b.business_id}>{b.business_name}</option>)}
              </select>
              <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-md border bg-secondary px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Upload className="size-3" /> Upload
              </button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
            </div>
          </div>
          <textarea
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[420px] w-full resize-y bg-secondary/50 p-[18px] font-mono text-[13px] leading-relaxed outline-none"
          />
          <div className="flex flex-wrap gap-1.5 border-t px-[18px] pt-3">
            {Object.entries(EXAMPLES).map(([key, val]) => (
              <button key={key} onClick={() => { setText(JSON.stringify(val, null, 2)); setError(null) }}
                className="rounded-md border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {val.business_name}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 px-[18px] py-3.5">
            <div className="text-[11.5px] leading-relaxed text-subtle">
              Expects <code className="font-mono text-muted-foreground">revenue_by_month</code> · reviews · repeat rate · support · ad spend
            </div>
            <button onClick={score} disabled={loading}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-[9px] bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[hsl(var(--accent-foreground))] disabled:opacity-60">
              <ArrowRight className="size-4" /> {loading ? "Scoring…" : "Score business"}
            </button>
          </div>
        </div>

        {/* Results */}
        <div>
          {loading ? (
            <div className="space-y-4"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive bg-destructive/5 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive"><CircleAlert className="size-4" /> Could not parse input</div>
              <p className="mt-2.5 font-mono text-[13px] leading-relaxed text-muted-foreground">{error}</p>
            </div>
          ) : report && submitted ? (
            <div className="animate-fade-in space-y-4">
              <div className="rounded-2xl border bg-card p-[22px] shadow-sm">
                <div className="flex items-center gap-[18px]">
                  <ScoreRing score={report.composite_score} size={116} stroke={10} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold tracking-tight">{report.business_name}</div>
                      {report.category && <span className="rounded-md border bg-secondary px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-subtle">{report.category}</span>}
                    </div>
                    <div className="mt-1.5 inline-flex items-center rounded-lg px-3 py-1 text-[13px] font-semibold" style={{ color: scoreColor(report.composite_score), background: scoreBg(report.composite_score) }}>
                      {grade(report.composite_score)}
                    </div>
                    <div className="mt-3.5 flex gap-5">
                      <Metric label="Confidence" value={<span style={{ color: confMeta(report.overall_confidence).color }}>{confMeta(report.overall_confidence).pct} · {confMeta(report.overall_confidence).tier}</span>} />
                      <Metric label="Coverage" value={`${Math.round(report.coverage * 100)}%`} />
                    </div>
                  </div>
                </div>
                {report.flags.length > 0 && <div className="mt-4"><FlagBadges flags={report.flags} score={report.composite_score} /></div>}
              </div>

              <div className="rounded-2xl border bg-card p-[22px] shadow-sm">
                <h3 className="mb-4 text-sm font-semibold">Signal scores</h3>
                <SignalBreakdown report={report} />
              </div>

              <ExplanationPanel report={report} />

              {(Object.keys(submitted.revenue_by_month || {}).length > 0 || Object.keys(aspects).length > 0) && (
                <div className="grid gap-4">
                  {Object.keys(submitted.revenue_by_month || {}).length > 1 && (
                    <div className="rounded-2xl border bg-card p-[22px] shadow-sm">
                      <h3 className="mb-2 text-sm font-semibold">Revenue trend</h3>
                      <TrendChart series={submitted.revenue_by_month} valueFormatter={fmtMoney} highlightLast={report.flags.includes("recent_revenue_shock")} yLabel="Revenue" height={180} />
                    </div>
                  )}
                  {Object.keys(aspects).length > 0 && (
                    <div className="rounded-2xl border bg-card p-[22px] shadow-sm">
                      <h3 className="mb-2 text-sm font-semibold">Review themes</h3>
                      <AspectsChart aspects={aspects} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed bg-secondary/40 px-7 py-14 text-center">
              <div className="mx-auto flex size-[52px] items-center justify-center rounded-[13px] bg-accent text-primary">
                <Activity className="size-6" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold">No results yet</h3>
              <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-relaxed text-muted-foreground">
                Edit the profile on the left and hit <b className="text-foreground">Score business</b>. Scores, confidence and a grounded explanation appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-subtle">{label}</div>
      <div className="mt-0.5 font-mono text-base font-semibold">{value}</div>
    </div>
  )
}
