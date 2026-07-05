import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({ meta: [{ title: "Pricing — Traders Toolkit" }] }),
  component: PricingPage,
});

const FREE = [
  "Dashboard",
  "Lot Size Calculator",
  "Risk Calculator",
  "Prop Firm Drawdown",
  "Trading Sessions",
  "Basic Trade Journal",
  "Analytics",
  "Fundamentals Bot (5 queries/day)",
  "1 year historical backtest data",
];

const PRO = [
  "Everything in Free",
  "Unlimited AI Trade Reviews",
  "Unlimited Fundamentals Bot",
  "SMC Pattern Detection",
  "MT5 Auto-Journaling",
  "TradingView Backtesting Station",
  "Unlimited historical data",
  "Advanced Analytics",
  "Priority support",
  "Early access to new features",
];

function PricingPage() {
  const { isPro } = useProfile();
  function checkout() {
    toast.info("Payments coming soon", { description: "Stripe checkout will go live shortly." });
  }

  return (
    <AppShell title="Pricing">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Trade like a pro</h2>
          <p className="mt-2 text-muted-foreground">Simple pricing. Cancel anytime.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Free</h3>
                {!isPro && <Badge variant="outline">Current</Badge>}
              </div>
              <p className="mt-2 text-4xl font-bold">$0<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <p className="mt-1 text-sm text-muted-foreground">Everything you need to start.</p>
              <ul className="mt-5 space-y-2 text-sm">
                {FREE.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-success" /> {f}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card className="relative border-primary/50 bg-gradient-to-br from-primary/10 via-card to-card shadow-glow">
            <Badge className="absolute -top-3 right-5 bg-primary text-primary-foreground">Most popular</Badge>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h3 className="text-xl font-semibold">Pro</h3></div>
                {isPro && <Badge>Active</Badge>}
              </div>
              <p className="mt-2 text-4xl font-bold">$29<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <p className="mt-1 text-sm text-muted-foreground">Full trading operating system.</p>
              <ul className="mt-5 space-y-2 text-sm">
                {PRO.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> {f}</li>)}
              </ul>
              {!isPro && <Button size="lg" className="mt-6 w-full" onClick={checkout}>Upgrade to Pro</Button>}
            </CardContent>
          </Card>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">All prices in USD. Secure payments via Stripe.</p>
      </div>
    </AppShell>
  );
}
