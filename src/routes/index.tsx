import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calculator, Shield, BookOpen, Brain, BarChart3, Clock, Sparkles,
  CheckCircle2, PlayCircle, ArrowRight, LineChart, Zap, Wallet, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import heroSummit from "@/assets/hero-summit.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tradivo — Better Tools. Smarter Traders. Stronger Together." },
      { name: "description", content: "Better tools, smarter traders, stronger together. Lot sizing, journaling, analytics, sessions and an economic calendar in one trading workspace." },
      { property: "og:title", content: "Tradivo — Better Tools. Smarter Traders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Lot sizing, journaling, analytics, sessions and an economic calendar for Forex, Gold, Indices and Crypto traders." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Calculator, title: "Lot Size Calculator", desc: "Broker-accurate sizing for Forex, metals, indices, oil and crypto — with live exchange rates for any account currency." },
  { icon: BookOpen, title: "Trade Journal", desc: "Log entries, exits, screenshots, setups and emotions so every trade becomes a lesson." },
  { icon: BarChart3, title: "Performance Analytics", desc: "Win rate, profit factor, expectancy, equity curve and streaks — see your real edge." },
  { icon: Clock, title: "Trading Sessions", desc: "Sydney, Tokyo, London and New York sessions and overlaps in your own timezone." },
  { icon: Zap, title: "Economic Calendar", desc: "High, medium and low impact releases with forecasts, previous values and a live NOW marker." },
  { icon: Shield, title: "MT5 Integration (Pro · soon)", desc: "Connect your MetaTrader 5 account to auto-sync trades straight into your journal." },
];

const benefits = [
  "Built for SMC and prop firm traders",
  "Dark, TradingView-inspired interface",
  "Live FX rates for exact pip values",
  "Pattern detection on your weaknesses",
  "Multi-account & multi-currency",
  "Mobile responsive — trade anywhere",
];

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <img src={heroSummit} alt="" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover object-right" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/10" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" aria-hidden />
        <div className="container relative mx-auto px-4 py-28 md:py-40">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="mr-1 h-3 w-3" /> Tools · Traders · Together
            </Badge>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              Better Tools.<br />Smarter Traders.
              <span className="block text-primary">Stronger Together.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
              Size every position precisely, journal every trade, track every session and never miss a market-moving release — one calm workspace for Forex, Gold, Indices and Crypto traders.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
                <Link to="/auth">Get Started Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline"><a href="#features">Explore features</a></Button>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              {[{ v: "70+", l: "Instruments" }, { v: "75+", l: "Account currencies" }, { v: "Live", l: "FX rates & calendar" }].map((s) => (
                <div key={s.l} className="rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur">
                  <p className="text-xl font-semibold text-primary">{s.v}</p>
                  <p className="text-xs text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Features</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Your complete trading workspace</h2>
          <p className="mt-3 text-muted-foreground">A blend of TradingView's precision and Notion's clarity, purpose-built for serious traders.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="bg-card/80 border-border/60 transition hover:border-primary/40 hover:shadow-glow">
              <CardContent className="p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="border-y border-border/60 bg-card/30 py-24">
        <div className="container mx-auto grid gap-12 px-4 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-medium text-secondary">Why traders pick us</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Built by traders, for traders.</h2>
            <p className="mt-3 text-muted-foreground">Stop juggling spreadsheets, calculators and a chaotic journal. Centralize your edge.</p>
            <ul className="mt-6 grid gap-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Wallet, t: "Protect Capital", d: "Daily drawdown guardrails." },
              { icon: Target, t: "Trade with Edge", d: "Setup analytics & expectancy." },
              { icon: Zap, t: "Move Fast", d: "Lightning-quick calculators." },
              { icon: LineChart, t: "Track Growth", d: "Equity curve & streaks." },
            ].map((b) => (
              <Card key={b.t} className="bg-card border-border/60">
                <CardContent className="p-5">
                  <b.icon className="h-5 w-5 text-accent" />
                  <p className="mt-3 font-semibold">{b.t}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{b.d}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Loved by serious traders</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            { n: "Marcus T.", r: "Funded — FTMO 200k", q: "The lot size calculator is spot on for gold and indices — no more guessing my risk." },
            { n: "Aisha K.", r: "SMC Trader", q: "Tagging BOS, FVG and OBs in the journal makes my reviews 10x sharper." },
            { n: "Daniel R.", r: "Gold Day Trader", q: "Fundamental bias on XAU and the AI reviewer changed how I prep my sessions." },
          ].map((t) => (
            <Card key={t.n} className="bg-card border-border/60">
              <CardContent className="p-6">
                <p className="text-sm text-foreground/90">"{t.q}"</p>
                <div className="mt-4 border-t border-border/60 pt-4">
                  <p className="text-sm font-semibold">{t.n}</p>
                  <p className="text-xs text-muted-foreground">{t.r}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-y border-border/60 bg-card/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Simple, trader-friendly pricing</h2>
            <p className="mt-3 text-muted-foreground">Start free. Upgrade when you're ready to scale.</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
            <Card className="bg-card border-border/60">
              <CardContent className="p-8">
                <p className="text-sm text-muted-foreground">Free</p>
                <p className="mt-2 text-4xl font-semibold">$0<span className="text-base text-muted-foreground">/mo</span></p>
                <ul className="mt-6 space-y-2 text-sm">
                  {["Lot Size Calculator","Risk & Drawdown Tools","Trading Sessions","Basic Journal"].map(i => (
                    <li key={i} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {i}</li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-6 w-full"><Link to="/auth">Get started</Link></Button>
              </CardContent>
            </Card>
            <Card className="relative bg-card border-primary/40 shadow-glow">
              <Badge className="absolute -top-3 left-6 bg-gradient-primary text-primary-foreground">Most Popular</Badge>
              <CardContent className="p-8">
                <p className="text-sm text-primary">Pro</p>
                <p className="mt-2 text-4xl font-semibold">$29<span className="text-base text-muted-foreground">/mo</span></p>
                <ul className="mt-6 space-y-2 text-sm">
                  {["Everything in Free","AI Trade Reviewer","Fundamental Bot","MT5 Auto-Sync (soon)","Backtesting Lab","Priority support"].map(i => (
                    <li key={i} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {i}</li>
                  ))}
                </ul>
                <Button asChild className="mt-6 w-full bg-gradient-primary text-primary-foreground hover:opacity-90"><Link to="/auth">Start Pro Trial</Link></Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto max-w-3xl px-4 py-24">
        <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">Frequently asked</h2>
        <Accordion type="single" collapsible className="mt-10">
          {[
            { q: "Which markets does it support?", a: "Forex, gold, indices and crypto out of the box — with proper contract-size handling per asset class." },
                        { q: "Can I import trades from MT5?", a: "MT5 auto-sync is a Pro feature coming soon. Until then you can log trades in the journal in seconds." },
            { q: "Is my data private?", a: "Your trades and screenshots stay tied to your account with row-level security on the backend." },
          ].map((f) => (
            <AccordionItem key={f.q} value={f.q} className="border-border/60">
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <SiteFooter />
    </div>
  );
}
