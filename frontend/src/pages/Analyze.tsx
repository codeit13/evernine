import { useEffect, useMemo, useRef, useState } from "react"
import { api, type BusinessInput, type BusinessSummary, type ScoreReport } from "@/lib/api"
import { ScoreGauge } from "@/components/score-gauge"
import { ExplanationPanel } from "@/components/explanation-panel"
import { SignalBreakdown } from "@/components/signal-breakdown"
import { HealthRadar } from "@/components/charts/health-radar"
import { TrendChart } from "@/components/charts/trend-chart"
import { AspectsChart } from "@/components/charts/aspects-chart"
import { ConfidenceBadge, FlagBadges } from "@/components/badges"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { fmtMoney, fmtPct } from "@/lib/format"
import { EXAMPLES } from "@/lib/examples"
import { Upload, Play, RotateCcw, AlertCircle } from "lucide-react"

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

  useEffect(() => {
    api.businesses().then(setBusinesses).catch(() => {})
  }, [])

  const roas = useMemo(() => (submitted ? computeRoas(submitted) : {}), [submitted])
  const aspects = (report?.signals.reviews?.drivers?.aspects ?? {}) as Record<
    string,
    { pos: number; neg: number }
  >

  async function loadExisting(id: string) {
    if (!id) return
    try {
      const biz = await api.businessDetail(id)
      setText(JSON.stringify(biz, null, 2))
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      setText(String(reader.result))
      setError(null)
    }
    reader.readAsText(f)
  }

  async function score() {
    setError(null)
    let payload: BusinessInput
    try {
      payload = JSON.parse(text)
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`)
      return
    }
    if (!payload.business_name) {
      setError("Payload needs at least a business_name and revenue_by_month.")
      return
    }
    setLoading(true)
    try {
      const r = await api.scorePayload(payload, true)
      setReport(r)
      setSubmitted(payload)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analyze a business</h1>
        <p className="text-sm text-muted-foreground">
          Score any business — start from a sample, upload a JSON file, or edit the data directly.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* Input panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Input data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  defaultValue=""
                  onChange={(e) => loadExisting(e.target.value)}
                >
                  <option value="" disabled>
                    Load a sample…
                  </option>
                  {businesses.map((b) => (
                    <option key={b.business_id} value={b.business_id}>
                      {b.business_name}
                    </option>
                  ))}
                </select>
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-4" />
                  Upload JSON
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={onFile}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {Object.entries(EXAMPLES).map(([key, val]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setText(JSON.stringify(val, null, 2))
                      setError(null)
                    }}
                  >
                    {val.business_name}
                  </Button>
                ))}
              </div>

              <textarea
                spellCheck={false}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-[340px] w-full resize-y rounded-md border border-input bg-muted/30 p-3 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={score} disabled={loading} className="flex-1">
                  <Play className="size-4" />
                  {loading ? "Scoring…" : "Score business"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setText(JSON.stringify(EXAMPLES.healthy, null, 2))
                    setReport(null)
                    setSubmitted(null)
                    setError(null)
                  }}
                  aria-label="Reset"
                >
                  <RotateCcw className="size-4" />
                </Button>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Schema: <code>business_name</code>, <code>revenue_by_month</code> {"{YYYY-MM: n}"},
                optional <code>customer_reviews</code>, <code>repeat_purchase_rate</code>,{" "}
                <code>customer_support_tickets</code>, <code>ad_spend_by_month</code>. Missing
                signals are handled gracefully.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Results panel */}
        <div>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : report && submitted ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{report.business_name}</h2>
                {report.category && <Badge variant="secondary">{report.category}</Badge>}
                <ConfidenceBadge band={report.confidence_band} />
                <Badge variant="muted">Coverage {fmtPct(report.coverage)}</Badge>
                <FlagBadges flags={report.flags} />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="flex flex-col items-center justify-center py-5">
                  <ScoreGauge score={report.composite_score} size={170} />
                </Card>
                <div className="md:col-span-2 space-y-4">
                  <ExplanationPanel report={report} />
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Signal shape</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <HealthRadar report={report} height={220} />
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Signal breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <SignalBreakdown report={report} />
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                {Object.keys(submitted.revenue_by_month || {}).length > 0 && (
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-base">Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TrendChart
                        series={submitted.revenue_by_month}
                        valueFormatter={(v) => fmtMoney(v)}
                        highlightLast={report.flags.includes("recent_revenue_shock")}
                        yLabel="Revenue"
                      />
                    </CardContent>
                  </Card>
                )}
                {Object.keys(roas).length > 0 && (
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-base">ROAS</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TrendChart
                        series={roas}
                        color="hsl(158 64% 42%)"
                        valueFormatter={(v) => `${v.toFixed(1)}x`}
                        yLabel="ROAS"
                      />
                    </CardContent>
                  </Card>
                )}
                {Object.keys(aspects).length > 0 && (
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-base">Review themes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AspectsChart aspects={aspects} />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Card className="flex h-full min-h-[420px] items-center justify-center border-dashed">
              <div className="max-w-sm px-6 text-center">
                <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                  <Play className="size-5" />
                </div>
                <h3 className="font-medium">Score a business to see results</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Load a sample, upload a JSON file, or edit the data on the left, then hit “Score
                  business”. You’ll get a composite health score, per-signal breakdown, a grounded
                  explanation, and charts.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
