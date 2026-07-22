import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Layers, Scale, ShieldCheck, TrendingUp, Star, LifeBuoy, Megaphone } from "lucide-react"

const SIGNALS = [
  {
    icon: TrendingUp,
    name: "Revenue",
    weight: "35%",
    desc: "Scores momentum and long-run trajectory (not absolute size), so a recent shock registers without erasing a strong history.",
  },
  {
    icon: LifeBuoy,
    name: "Loyalty & Ops",
    weight: "30%",
    desc: "Repeat-purchase rate plus support quality (48h resolution and escalation), with small ticket volumes handled conservatively.",
  },
  {
    icon: Star,
    name: "Reviews",
    weight: "20%",
    desc: "Star ratings blended with transformer-based sentiment on the text, which surfaces operational issues a star average hides.",
  },
  {
    icon: Megaphone,
    name: "Ad Efficiency",
    weight: "15%",
    desc: "Return on ad spend (revenue per ad dollar) and its trend — efficiency, not raw spend.",
  },
]

const LAYERS = [
  {
    icon: Scale,
    title: "1 · Confidence shrinkage",
    body: "Each signal produces a sub-score and a confidence (from data volume, recency, and consistency). Thin or noisy signals are pulled toward a neutral prior instead of being trusted at face value.",
  },
  {
    icon: Layers,
    title: "2 · Weighted aggregation",
    body: "Present sub-scores are combined by importance weight, renormalised over what's available. A missing signal is excluded — never silently scored as zero.",
  },
  {
    icon: ShieldCheck,
    title: "3 · Confidence, reported",
    body: "Overall confidence and data coverage are reported alongside the score, so 'how healthy' and 'how sure we are' are never conflated.",
  },
]

export default function Methodology() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
      <div>
        <Badge variant="default" className="mb-2">
          How scoring works
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight">
          A health score you can actually defend
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Evernine turns several noisy, unevenly-available signals about a business into a single
          0–100 health score. The hard part isn't the average — it's handling data that's rich for
          one business and barely there for another. Every score comes with an explicit confidence.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          The scoring mechanism
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {LAYERS.map((l) => (
            <Card key={l.title}>
              <CardHeader className="pb-2">
                <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                  <l.icon className="size-4" />
                </div>
                <CardTitle className="text-sm">{l.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{l.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          The four signals
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SIGNALS.map((s) => (
            <Card key={s.name}>
              <CardContent className="flex gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <s.icon className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    <Badge variant="muted">{s.weight}</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Grounded explanations
        </h2>
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success">
              <ShieldCheck className="size-5" />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every business gets a plain-language explanation generated from its computed numbers.
              A groundedness guard automatically cross-checks each figure in the text against the
              actual sub-scores — if a number can't be verified, the explanation is regenerated or
              replaced with a deterministic summary. The <strong className="text-foreground">Grounded</strong> badge
              means it passed.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
