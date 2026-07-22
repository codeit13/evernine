const SIGNALS = [
  { weight: "35%", label: "Revenue", desc: "Recency-weighted momentum and long-run trend — scored on trajectory, not size." },
  { weight: "30%", label: "Loyalty & support", desc: "Repeat-purchase rate plus 48-hour support resolution and escalation, small volumes handled conservatively." },
  { weight: "20%", label: "Reviews", desc: "Star ratings blended with transformer sentiment on the text, so operational issues a star average hides still surface." },
  { weight: "15%", label: "Ad efficiency", desc: "Return on ad spend and its trend — efficiency, not raw spend." },
]

export default function Methodology() {
  return (
    <main className="mx-auto max-w-[820px] animate-fade-in px-[26px] pb-[72px] pt-10">
      <div className="mb-[26px]">
        <h1 className="text-[26px] font-semibold tracking-tight">How Evernine scores a business</h1>
        <p className="mt-2.5 max-w-[620px] text-[14.5px] leading-relaxed text-muted-foreground">
          Every health score is a confidence-weighted composite of four grounded signals. Nothing is inferred beyond the
          numbers a business provides — and each score carries a confidence level tied to how complete that data is. Thin
          signals are shrunk toward a neutral prior instead of being trusted at face value, and missing ones are excluded,
          never scored as zero.
        </p>
      </div>

      <div className="mb-[30px] flex flex-col gap-3">
        {SIGNALS.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-[13px] border bg-card px-5 py-4 shadow-sm">
            <div className="min-w-[52px] font-mono text-[20px] font-semibold text-primary">{s.weight}</div>
            <div className="flex-1">
              <div className="text-[15px] font-semibold">{s.label}</div>
              <div className="mt-0.5 text-[13px] text-muted-foreground">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[14px] border bg-card p-[22px] shadow-sm">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: "hsl(var(--success))", background: "hsl(var(--success) / 0.12)" }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
              <path d="M4.4 7.1 6.2 8.9 9.7 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Grounded explanations
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Each AI explanation traces every claim back to a computed metric. A groundedness guard cross-checks every number
            in the text against the actual sub-scores — if a figure can't be verified, the explanation is regenerated or
            replaced with a deterministic summary.
          </p>
        </div>
        <div className="rounded-[14px] border bg-card p-[22px] shadow-sm">
          <div className="mb-2.5 text-sm font-semibold">Confidence &amp; coverage</div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Confidence reflects how much of the four-signal profile is present and complete. A high score on thin data is
            flagged, not trusted — sparse coverage pulls confidence into the{" "}
            <span className="font-semibold" style={{ color: "hsl(var(--destructive))" }}>Low</span> band.
          </p>
        </div>
      </div>
    </main>
  )
}
