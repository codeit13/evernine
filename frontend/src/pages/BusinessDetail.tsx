import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api, type BusinessInput, type ScoreReport } from "@/lib/api"
import { ScoreGauge } from "@/components/score-gauge"
import { SignalBreakdown } from "@/components/signal-breakdown"
import { ExplanationPanel } from "@/components/explanation-panel"
import { ConfidenceBadge, FlagBadges } from "@/components/badges"
import { HealthRadar } from "@/components/charts/health-radar"
import { TrendChart } from "@/components/charts/trend-chart"
import { AspectsChart } from "@/components/charts/aspects-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { fmtMoney, fmtPct, signalLabel } from "@/lib/format"
import { ArrowLeft, Star } from "lucide-react"

function computeRoas(biz: BusinessInput): Record<string, number> {
  const out: Record<string, number> = {}
  for (const m of Object.keys(biz.revenue_by_month)) {
    const ad = biz.ad_spend_by_month[m]
    if (ad && ad > 0) out[m] = +(biz.revenue_by_month[m] / ad).toFixed(2)
  }
  return out
}

export default function BusinessDetail() {
  const { id = "" } = useParams()
  const [report, setReport] = useState<ScoreReport | null>(null)
  const [raw, setRaw] = useState<BusinessInput | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setReport(null)
    setRaw(null)
    setError(null)
    Promise.all([api.scoreOne(id, true), api.businessDetail(id)])
      .then(([r, b]) => {
        setReport(r)
        setRaw(b)
      })
      .catch((e) => setError(String(e)))
  }, [id])

  const roas = useMemo(() => (raw ? computeRoas(raw) : {}), [raw])

  if (error)
    return (
      <div className="space-y-4">
        <BackLink />
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    )

  if (!report)
    return (
      <div className="space-y-4">
        <BackLink />
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80" />
          <Skeleton className="h-80 lg:col-span-2" />
        </div>
      </div>
    )

  const reviews = report.signals.reviews
  const aspects = (reviews?.drivers?.aspects ?? {}) as Record<string, { pos: number; neg: number }>

  return (
    <div className="space-y-6 animate-fade-in">
      <BackLink />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{report.business_name}</h1>
            {report.category && <Badge variant="secondary">{report.category}</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ConfidenceBadge band={report.confidence_band} />
            <Badge variant="muted">Coverage {fmtPct(report.coverage)}</Badge>
            <FlagBadges flags={report.flags} />
          </div>
        </div>
      </div>

      {/* Top: gauge + explanation */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center py-6">
          <ScoreGauge score={report.composite_score} size={190} />
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-center text-sm">
            <div>
              <div className="font-semibold tabular-nums">{Math.round(report.overall_confidence * 100)}%</div>
              <div className="text-xs text-muted-foreground">Confidence</div>
            </div>
            <div>
              <div className="font-semibold tabular-nums">{fmtPct(report.coverage)}</div>
              <div className="text-xs text-muted-foreground">Coverage</div>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <ExplanationPanel report={report} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Signal shape</CardTitle>
            </CardHeader>
            <CardContent>
              <HealthRadar report={report} height={240} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="signals">
        <TabsList>
          <TabsTrigger value="signals">Signal breakdown</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="facts">Underlying data</TabsTrigger>
        </TabsList>

        <TabsContent value="signals">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">How each signal contributes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Each sub-score is shrunk toward its prior in proportion to how much data supports it,
                then weighted. Missing signals are excluded, never scored as zero.
              </p>
            </CardHeader>
            <CardContent>
              <SignalBreakdown report={report} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Revenue</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {report.flags.includes("recent_revenue_shock")
                    ? "Recent shock highlighted in red."
                    : "Monthly revenue trend."}
                </p>
              </CardHeader>
              <CardContent>
                {raw && Object.keys(raw.revenue_by_month).length > 0 ? (
                  <TrendChart
                    series={raw.revenue_by_month}
                    color="hsl(var(--primary))"
                    valueFormatter={(v) => fmtMoney(v)}
                    highlightLast={report.flags.includes("recent_revenue_shock")}
                    yLabel="Revenue"
                  />
                ) : (
                  <Empty />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Marketing efficiency (ROAS)</CardTitle>
                <p className="text-sm text-muted-foreground">Revenue per ad dollar, by month.</p>
              </CardHeader>
              <CardContent>
                {Object.keys(roas).length > 0 ? (
                  <TrendChart
                    series={roas}
                    color="hsl(158 64% 42%)"
                    valueFormatter={(v) => `${v.toFixed(1)}x`}
                    yLabel="ROAS"
                  />
                ) : (
                  <Empty />
                )}
              </CardContent>
            </Card>

            {raw && Object.keys(raw.ad_spend_by_month).length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader className="pb-1">
                  <CardTitle className="text-base">Ad spend</CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart
                    series={raw.ad_spend_by_month}
                    color="hsl(35 92% 50%)"
                    valueFormatter={(v) => fmtMoney(v)}
                    yLabel="Ad spend"
                    height={180}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          {reviews?.present ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-base">Complaint & praise themes</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Extracted from review text ({reviews.drivers?.sentiment_backend} sentiment).
                  </p>
                </CardHeader>
                <CardContent>
                  <AspectsChart aspects={aspects} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-base">Reviews</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {reviews.drivers?.n_reviews} reviews · avg {reviews.drivers?.mean_rating ?? "—"}★
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(raw?.customer_reviews ?? []).map((rev, i) => (
                    <div key={i} className="flex gap-3 rounded-lg border p-2.5">
                      <div className="flex shrink-0 items-center gap-0.5 text-warning">
                        {rev.rating ?? "—"}
                        <Star className="size-3 fill-current" />
                      </div>
                      <p className="text-sm text-foreground/90">{rev.text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No review data for this business — the reviews signal is excluded from the score.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="facts">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Grounded facts per signal</CardTitle>
              <p className="text-sm text-muted-foreground">
                The exact computed values passed to the explanation model.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(report.signals).map(([key, s]) =>
                s.present ? (
                  <div key={key}>
                    <div className="mb-1.5 text-sm font-medium">{signalLabel(key)}</div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg border p-3 text-sm sm:grid-cols-3">
                      {Object.entries(s.drivers)
                        .filter(([, v]) => typeof v !== "object" || v === null)
                        .map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                            <span className="font-medium tabular-nums">{String(v)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
      <Link to="/">
        <ArrowLeft className="size-4" />
        Portfolio
      </Link>
    </Button>
  )
}

function Empty() {
  return (
    <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
      No data available.
    </div>
  )
}
