import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Trophy, Target, Activity, Calendar, Calculator, Shield, Building2, Clock, ArrowRight, Flame } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Smart Trader Toolkit" }] }),
  component: Dashboard,
});

const stats = [
  { label: "Account Balance", value: "$10,000.00", sub: "USD", icon: Activity, accent: "text-foreground" },
  { label: "Total Trades", value: "0", sub: "Add your first trade", icon: Target, accent: "text-foreground" },
  { label: "Win Rate", value: "—", sub: "Awaiting data", icon: Trophy, accent: "text-foreground" },
  { label: "Profit Factor", value: "—", sub: "Awaiting data", icon: TrendingUp, accent: "text-foreground" },
  { label: "Avg RR", value: "—", sub: "Awaiting data", icon: Target, accent: "text-foreground" },
  { label: "Current Drawdown", value: "0.0%", sub: "Healthy", icon: TrendingDown, accent: "text-success" },
  { label: "Streak", value: "0", sub: "Trades", icon: Flame, accent: "text-accent" },
  { label: "Weekly P&L", value: "$0.00", sub: "This week", icon: Calendar, accent: "text-foreground" },
];

const tools = [
  { to: "/lot-size", icon: Calculator, t: "Lot Size", d: "Forex, gold, indices, crypto" },
  { to: "/risk", icon: Shield, t: "Risk Manager", d: "Daily & max drawdown" },
  { to: "/prop-firm", icon: Building2, t: "Prop Firm", d: "FTMO-style rules" },
  { to: "/sessions", icon: Clock, t: "Sessions", d: "London, NY, Tokyo, Sydney" },
];

function Dashboard() {
  const { user } = useAuth();
  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Trader";

  return (
    <AppShell title="Dashboard">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h2 className="text-2xl font-semibold tracking-tight">{name}</h2>
        </div>
        <Badge variant="outline" className="border-success/40 bg-success/10 text-success">All systems healthy</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60 bg-card shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className={`mt-3 text-2xl font-semibold ${s.accent}`}>{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 bg-card">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Equity Curve</h3>
              <Badge variant="outline">Last 30 days</Badge>
            </div>
            <div className="h-56 rounded-lg border border-border/60 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 grid place-items-center text-sm text-muted-foreground">
              Connect MT5 or log trades to see your equity curve
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card">
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">Recent Trades</h3>
            <div className="grid h-56 place-items-center rounded-lg border border-dashed border-border/60 text-center text-sm text-muted-foreground">
              No trades yet.<br />Add your first one from the journal.
            </div>
          </CardContent>
        </Card>
      </div>

      <h3 className="mt-10 mb-3 text-sm font-medium text-muted-foreground">Quick tools</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((t) => (
          <Link key={t.to} to={t.to} className="group">
            <Card className="border-border/60 bg-card transition hover:border-primary/40 hover:shadow-glow">
              <CardContent className="flex items-center gap-3 p-5">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                  <t.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{t.t}</p>
                  <p className="text-xs text-muted-foreground">{t.d}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
