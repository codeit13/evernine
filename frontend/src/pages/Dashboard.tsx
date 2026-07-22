import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { api, type ScoreReport } from "@/lib/api"
import { BusinessCard } from "@/components/business-card"
import { PortfolioScatter } from "@/components/charts/portfolio-scatter"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { scoreColor } from "@/lib/format"
import { Building2, Gauge, HeartPulse, TriangleAlert, FlaskConical } from "lucide-react"

export default function Dashboard() {
  const [reports, setReports] = useState<ScoreReport[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .scoreAll(false)
      .then(setReports)
      .catch((e) => setError(String(e)))
  }, [])

  const kpis = useMemo(() => {
    if (!reports || reports.length === 0) return null
    const n = reports.length
    const avg = reports.reduce((s, r) => s + r.composite_score, 0) / n
    const avgConf = reports.reduce((s, r) => s + r.overall_confidence, 0) / n
    const atRisk = reports.filter((r) => r.composite_score < 40).length
    return { n, avg, avgConf, atRisk }
  }, [reports])

  const sorted = useMemo(
    () => (reports ? [...reports].sort((a, b) => b.composite_score - a.composite_score) : []),
    [reports]
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio health</h1>
          <p className="text-sm text-muted-foreground">
            Confidence-aware health scores across your D2C businesses.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/analyze">
            <FlaskConical className="size-4" />
            Analyze a business
          </Link>
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">
            Could not load portfolio: {error}
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis ? (
          <>
            <StatCard label="Businesses" value={kpis.n} icon={<Building2 className="size-4" />} />
            <StatCard
              label="Avg health"
              value={kpis.avg.toFixed(0)}
              accent={scoreColor(kpis.avg)}
              icon={<HeartPulse className="size-4" />}
            />
            <StatCard
              label="Avg confidence"
              value={`${Math.round(kpis.avgConf * 100)}%`}
              icon={<Gauge className="size-4" />}
            />
            <StatCard
              label="At risk"
              value={kpis.atRisk}
              sub={kpis.atRisk === 1 ? "business below 40" : "businesses below 40"}
              accent={kpis.atRisk > 0 ? "hsl(var(--destructive))" : undefined}
              icon={<TriangleAlert className="size-4" />}
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)
        )}
      </div>

      {/* Portfolio matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health vs. confidence</CardTitle>
          <p className="text-sm text-muted-foreground">
            Bubble size = data coverage. Click a bubble to drill in.
          </p>
        </CardHeader>
        <CardContent>
          {reports ? (
            <PortfolioScatter reports={reports} />
          ) : (
            <Skeleton className="h-[320px] w-full" />
          )}
        </CardContent>
      </Card>

      {/* Business grid */}
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          All businesses
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports
            ? sorted.map((r) => <BusinessCard key={r.business_id} report={r} />)
            : Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[210px]" />)}
        </div>
      </div>
    </div>
  )
}
