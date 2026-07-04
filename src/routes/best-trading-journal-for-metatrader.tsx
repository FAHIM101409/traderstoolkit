import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, ArrowRight, Sparkles, Zap, Shield, LineChart, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import dashboardImg from "@/assets/mt5-journal-dashboard.jpg";
import tradeDetailImg from "@/assets/mt5-journal-trade-detail.jpg";

const CANONICAL = "https://smarttraderstoolkit.lovable.app/best-trading-journal-for-metatrader";

export const Route = createFileRoute("/best-trading-journal-for-metatrader")({
  head: () => ({
    meta: [
      { title: "Best Trading Journal for MetaTrader (MT5 & MT4) in 2026" },
      { name: "description", content: "Compare the best trading journals for MetaTrader. Auto-sync MT5 & MT4 trades, SMC tagging, AI review and prop firm analytics — see why Smart Trader Toolkit ranks #1." },
      { property: "og:title", content: "Best Trading Journal for MetaTrader (MT5 & MT4)" },
      { property: "og:description", content: "Auto-sync MT5/MT4 trades, tag SMC setups, get AI feedback, and pass prop firm challenges. Full comparison vs TraderVue, TradeZella and TraderSync." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { property: "og:image", content: `https://smarttraderstoolkit.lovable.app${dashboardImg}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://smarttraderstoolkit.lovable.app${dashboardImg}` },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Best Trading Journal for MetaTrader (MT5 & MT4) in 2026",
          description: "Comparison of the best trading journals with MetaTrader integration.",
          author: { "@type": "Organization", name: "Smart Trader Toolkit" },
          mainEntityOfPage: CANONICAL,
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "Does it work with MT4 and MT5?", acceptedAnswer: { "@type": "Answer", text: "Yes — auto-sync works with both MetaTrader 4 and MetaTrader 5 via the investor password, so your credentials stay safe." } },
            { "@type": "Question", name: "Is it safe to connect my MetaTrader account?", acceptedAnswer: { "@type": "Answer", text: "We use MT5 investor (read-only) passwords. We can never place, modify or close trades on your account." } },
            { "@type": "Question", name: "Does it support prop firm accounts?", acceptedAnswer: { "@type": "Answer", text: "Yes. FTMO, FundedNext, Funding Traders, Goat and AquaFunded rules are built in with real-time drawdown tracking." } },
          ],
        }),
      },
    ],
  }),
  component: Page,
});

const comparisonRows = [
  { f: "MT5 auto-sync via investor password", stt: true, tv: false, tz: false, ts: "Manual CSV" },
  { f: "MT4 support", stt: true, tv: true, tz: false, ts: true },
  { f: "SMC tagging (BOS, FVG, OB)", stt: true, tv: false, tz: false, ts: false },
  { f: "AI trade review", stt: true, tv: false, tz: "Beta", ts: false },
  { f: "Prop firm drawdown engine", stt: true, tv: false, tz: true, ts: false },
  { f: "Screenshot & chart notes", stt: true, tv: true, tz: true, ts: true },
  { f: "Free forever plan", stt: true, tv: true, tz: false, ts: true },
  { f: "Starting price (Pro)", stt: "$29/mo", tv: "$29/mo", tz: "$39/mo", ts: "$29.95/mo" },
];

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <CheckCircle2 className="mx-auto h-5 w-5 text-success" aria-label="Yes" />;
  if (v === false) return <XCircle className="mx-auto h-5 w-5 text-muted-foreground/50" aria-label="No" />;
  return <span className="text-sm text-muted-foreground">{v}</span>;
}

const features = [
  { icon: Zap, t: "One-click MT5 sync", d: "Paste your investor password once. Every fill, SL, TP and swap flows into the journal automatically." },
  { icon: Brain, t: "AI trade reviewer", d: "Upload the chart. Get scored on entry timing, risk placement, exit discipline and psychology." },
  { icon: LineChart, t: "SMC setup analytics", d: "Tag BOS, CHoCH, FVG, OB and liquidity grabs — see exactly which setup prints your edge." },
  { icon: Shield, t: "Prop firm guardrails", d: "Live drawdown for FTMO, FundedNext, Funding Traders, Goat and AquaFunded. Never bust again." },
];

function Page() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" aria-hidden />
        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="mr-1 h-3 w-3" /> Updated for 2026
            </Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
              The Best Trading Journal for MetaTrader
              <span className="block bg-gradient-primary bg-clip-text text-transparent">MT5 & MT4, auto-synced.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
              Most journals ask you to upload a CSV. Smart Trader Toolkit connects directly to MetaTrader 5 with a read-only investor password — every trade, SL, TP and swap lands in your journal the second it fills.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                <Link to="/auth">Connect MetaTrader Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#comparison">See comparison</a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Investor password only — we can never place, modify or close your trades.</p>
          </div>

          <div className="relative mx-auto mt-14 max-w-5xl">
            <div className="rounded-2xl border border-border/80 bg-card p-2 shadow-card">
              <img
                src={dashboardImg}
                width={1600}
                height={1000}
                alt="Smart Trader Toolkit trading journal dashboard with MetaTrader 5 auto-synced trades"
                className="rounded-xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* WHY MT INTEGRATION MATTERS */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Why MetaTrader integration matters</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">CSV uploads are broken by design</h2>
          <p className="mt-3 text-muted-foreground">
            Manual imports lose swaps, miss partial closes and skip trades you took on your phone. Real integration means your journal matches your MT5 history report — down to the pip.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.t} className="bg-card/80 border-border/60 transition hover:border-primary/40 hover:shadow-glow">
              <CardContent className="p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* COMPARISON */}
      <section id="comparison" className="border-y border-border/60 bg-card/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-secondary">Head-to-head</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Smart Trader Toolkit vs TraderVue, TradeZella & TraderSync</h2>
            <p className="mt-3 text-muted-foreground">Feature-by-feature, focused on what MetaTrader traders actually need.</p>
          </div>

          <div className="mx-auto mt-10 max-w-5xl overflow-x-auto rounded-xl border border-border/60 bg-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-background/40">
                  <th className="p-4 text-left font-medium text-muted-foreground">Feature</th>
                  <th className="p-4 text-center font-semibold text-primary">Smart Trader Toolkit</th>
                  <th className="p-4 text-center font-medium text-muted-foreground">TraderVue</th>
                  <th className="p-4 text-center font-medium text-muted-foreground">TradeZella</th>
                  <th className="p-4 text-center font-medium text-muted-foreground">TraderSync</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((r) => (
                  <tr key={r.f} className="border-b border-border/60 last:border-0">
                    <td className="p-4 text-foreground/90">{r.f}</td>
                    <td className="p-4 text-center bg-primary/5"><Cell v={r.stt} /></td>
                    <td className="p-4 text-center"><Cell v={r.tv} /></td>
                    <td className="p-4 text-center"><Cell v={r.tz} /></td>
                    <td className="p-4 text-center"><Cell v={r.ts} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Pricing and features accurate as of 2026. Competitor plans change frequently — verify on their sites.</p>
        </div>
      </section>

      {/* SCREENSHOT SECTION */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-medium text-primary">Trade review</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Every MT5 trade, annotated and scored</h2>
            <p className="mt-3 text-muted-foreground">
              Auto-synced trades open with the chart snapshot from your entry time. Add SMC tags, notes and screenshots — then let the AI grade your execution against your rules.
            </p>
            <ul className="mt-6 grid gap-3 text-sm">
              {[
                "Chart snapshot captured at fill time",
                "SMC pills for BOS / CHoCH / FVG / OB",
                "AI score for entry, exit and psychology",
                "Filter by pair, session, setup or emotion",
              ].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-2 shadow-card">
            <img
              src={tradeDetailImg}
              width={1600}
              height={1000}
              loading="lazy"
              alt="Trade detail view of an MT5 trade with SMC tags and AI review score"
              className="rounded-xl w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/60 bg-card/30 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">MetaTrader journal FAQ</h2>
          <Accordion type="single" collapsible className="mt-10">
            {[
              { q: "Does it work with MT4 and MT5?", a: "Yes — auto-sync works with both MetaTrader 4 and MetaTrader 5 via the investor password, so your credentials stay safe." },
              { q: "Is it safe to connect my MetaTrader account?", a: "We only accept the MT5 investor (read-only) password. We can never place, modify or close trades on your account — only read the fills history." },
              { q: "Does it support prop firm accounts?", a: "Yes. FTMO, FundedNext, Funding Traders, Goat and AquaFunded rules are built in with live drawdown tracking, so you get warned before you bust." },
              { q: "What if my broker doesn't allow investor password?", a: "You can still import trades via CSV or by pasting your MT5 history report. Auto-sync will resume when your broker enables it." },
              { q: "Do I need to install an EA on MT5?", a: "No. Connection is server-side via your broker's MT5 endpoint — nothing to install and nothing running on your machine." },
            ].map((f) => (
              <AccordionItem key={f.q} value={f.q} className="border-border/60">
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Ready to journal like a funded trader?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Connect MetaTrader in under 60 seconds. Free plan, no card required.</p>
        <Button asChild size="lg" className="mt-8 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          <Link to="/auth">Start Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </section>

      <SiteFooter />
    </div>
  );
}