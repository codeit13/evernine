import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api, type ScoreReport } from "@/lib/api"
import { BusinessCard } from "@/components/business-card"
import { PortfolioScatter } from "@/components/charts/portfolio-scatter"
import { StatCard } from "@/components/stat-card"
import { Skeleton } from "@/components/ui/skeleton"
import { scoreColor, grade } from "@/lib/format"
import { List, TrendingUp, Crosshair, TriangleAlert, Plus, SlidersHorizontal } from "lucide-react"

export default function Dashboard() {
  const [reports, setReports] = useState<ScoreReport[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.scoreAll(false).then(setReports).catch((e) => setError(String(e)))
  }, [])

  const kpis = useMemo(() => {
    if (!reports || reports.length === 0) return null
    const n = reports.length
    const avg = Math.round(reports.reduce((s, r) => s + r.composite_score, 0) / n)
    const avgConf = Math.round((reports.reduce((s, r) => s + r.overall_confidence, 0) / n) * 100)
    const atRisk = reports.filter(
      (r) => r.composite_score < 55 || r.flags.includes("recent_revenue_shock")
    ).length
    return { n, avg, avgConf, atRisk }
  }, [reports])

  const sorted = useMemo(
    () => (reports ? [...reports].sort((a, b) => b.composite_score - a.composite_score) : []),
    [reports]
  )

  return (
    <main className="mx-auto max-w-[1280px] animate-fade-in px-[26px] pb-[72px] pt-[34px]">
      <div className="mb-[26px] flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-[25px] font-semibold tracking-tight">Portfolio health</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Composite scores across {reports?.length ?? "—"} D2C brands · updated continuously from four grounded signals
          </p>
        </div>
        <div className="flex gap-2.5">
          <button className="flex items-center gap-1.5 rounded-[9px] border bg-card px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <SlidersHorizontal className="size-3.5" /> Filters
          </button>
          <button
            onClick={() => navigate("/analyze")}
            className="flex items-center gap-1.5 rounded-[9px] bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[hsl(var(--accent-foreground))]"
          >
            <Plus className="size-3.5" /> Score a business
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load portfolio: {error}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis ? (
          <>
            <StatCard label="Businesses" value={kpis.n} icon={<List className="size-3.5" />} sub={`across ${kpis.n} D2C categories`} />
            <StatCard label="Avg health" value={kpis.avg} unit="/100" color={scoreColor(kpis.avg)} icon={<TrendingUp className="size-3.5" />} sub={`${grade(kpis.avg)} portfolio-wide`} />
            <StatCard label="Avg confidence" value={kpis.avgConf} unit="/100" color={scoreColor(kpis.avgConf)} icon={<Crosshair className="size-3.5" />} sub="model certainty" />
            <StatCard label="At-risk" value={kpis.atRisk} color={kpis.atRisk > 0 ? "hsl(var(--destructive))" : "hsl(var(--success))"} icon={<TriangleAlert className="size-3.5" />} sub="health < 55 or flagged" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)
        )}
      </div>

      <div className="mb-5 rounded-2xl border bg-card px-[22px] pb-3 pt-5 shadow-sm">
        <div className="mb-1.5 flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">Health vs. Confidence</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Bubble size scales with monthly revenue. High-health, low-confidence brands are prime for deeper data collection.
            </p>
          </div>
          <div className="hidden items-center gap-3.5 text-xs text-muted-foreground sm:flex">
            <Legend color="hsl(var(--success))" label="Healthy" />
            <Legend color="hsl(var(--warning))" label="Watch" />
            <Legend color="hsl(var(--destructive))" label="At risk" />
          </div>
        </div>
        {reports ? <PortfolioScatter reports={reports} /> : <Skeleton className="h-[340px] w-full" />}
      </div>

      <div className="mx-0.5 mb-3.5 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">
          Businesses <span className="font-medium text-subtle">· {reports?.length ?? 0}</span>
        </h2>
        <span className="text-[12.5px] text-subtle">Click any card for the full breakdown</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reports
          ? sorted.map((r) => <BusinessCard key={r.business_id} report={r} />)
          : Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[190px] rounded-2xl" />)}
      </div>
    </main>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
