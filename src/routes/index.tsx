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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Trader Toolkit — Everything a Trader Needs. One Toolkit." },
      { name: "description", content: "Risk Management, Journaling, Backtesting, Fundamentals and Prop Firm Analytics in one professional trading platform." },
      { property: "og:title", content: "Smart Trader Toolkit" },
      { property: "og:description", content: "The all-in-one trading operating system for Forex, Gold, Crypto, Prop Firm and SMC traders." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Calculator, title: "Lot Size & Risk Calculators", desc: "Forex, gold, indices and crypto with precise position sizing and RR." },
  { icon: Shield, title: "Prop Firm Drawdown Engine", desc: "Funding Traders, FundedNext, Goat, AquaFunded — custom rules supported." },
  { icon: BookOpen, title: "Smart Trade Journal", desc: "Screenshots, SMC tags (BOS, FVG, OB), notes and full analytics." },
  { icon: Brain, title: "AI Trade Reviewer", desc: "Upload your chart. Get entry, risk and psychology scoring instantly." },
  { icon: BarChart3, title: "Fundamental Intelligence", desc: "CPI, NFP, rate decisions and AI-driven bias on gold and majors." },
  { icon: Clock, title: "Backtesting Lab", desc: "Replay mode, prop-firm simulator and detailed strategy stats." },
];

const benefits = [
  "Built for SMC and prop firm traders",
  "Dark, TradingView-inspired interface",
  "Auto-sync trades from MT5",
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
        <div className="absolute inset-0 bg-gradient-hero" aria-hidden />
        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="mr-1 h-3 w-3" /> New: AI Trade Reviewer
            </Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Everything a Trader Needs.
              <span className="block bg-gradient-primary bg-clip-text text-transparent">One Toolkit.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
              Risk Management, Journaling, Backtesting, Fundamentals and Prop Firm Analytics in one professional platform — built for Forex, Gold, Crypto, SMC and prop firm traders.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                <Link to="/auth">Get Started Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline">
                <PlayCircle className="mr-2 h-4 w-4" /> Watch Demo
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Free forever plan • No credit card required</p>
          </div>

          {/* Mock dashboard preview */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="rounded-2xl border border-border/80 bg-card p-2 shadow-card">
              <div className="grid gap-2 rounded-xl bg-background/60 p-4 md:grid-cols-4">
                {[
                  { l: "Win Rate", v: "64.3%", c: "text-success" },
                  { l: "Profit Factor", v: "2.18", c: "text-foreground" },
                  { l: "Avg RR", v: "1:2.4", c: "text-foreground" },
                  { l: "Drawdown", v: "-3.1%", c: "text-danger" },
                ].map((s) => (
                  <div key={s.l} className="rounded-lg border border-border/60 bg-card p-4">
                    <p className="text-xs text-muted-foreground">{s.l}</p>
                    <p className={`mt-2 text-2xl font-semibold ${s.c}`}>{s.v}</p>
                  </div>
                ))}
                <div className="md:col-span-4 h-48 rounded-lg border border-border/60 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
              </div>
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
            { n: "Marcus T.", r: "Funded — FTMO 200k", q: "The prop firm drawdown calculator alone saved my account twice." },
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
                  {["Everything in Free","AI Trade Reviewer","Fundamental Bot","MT5 Auto-Sync","Backtesting Lab","Prop Firm Simulator"].map(i => (
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
            { q: "Do you support prop firm rules?", a: "Yes — Funding Traders, FundedNext, Goat Funded Trader and AquaFunded are built-in. You can also add custom rules." },
            { q: "Can I import trades from MT5?", a: "Pro accounts can connect MT5 to auto-sync entries, exits, lot sizes and P&L." },
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
