import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Trophy, Target, Activity, Calendar, Calculator, Shield, Building2, Clock, ArrowRight, Flame, Cable } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Smart Trader Toolkit" }] }),
  component: Dashboard,
});

const tools = [
  { to: "/lot-size", icon: Calculator, t: "Lot Size", d: "Forex, gold, indices, crypto" },
  { to: "/risk", icon: Shield, t: "Risk Manager", d: "Daily & max drawdown" },
  { to: "/prop-firm", icon: Building2, t: "Prop Firm", d: "FTMO-style rules" },
  { to: "/sessions", icon: Clock, t: "Sessions", d: "London, NY, Tokyo, Sydney" },
];

type Trade = { id: string; pair: string; direction: string; pnl: number | null; rr_realized: number | null; status: string; opened_at: string; closed_at: string | null; entry_price: number | null; exit_price: number | null; source: string };

function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const ccy = profile?.account_currency ?? "USD";
  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Trader";
  const [trades, setTrades] = useState<Trade[]>([]);
  const [hasMt5, setHasMt5] = useState(false);
  const [range, setRange] = useState<"30" | "90" | "365">("30");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [t, m] = await Promise.all([
        supabase.from("trades").select("id,pair,direction,pnl,rr_realized,status,opened_at,closed_at,entry_price,exit_price,source").eq("user_id", user.id).order("opened_at", { ascending: true }),
        supabase.from("mt5_tokens").select("id").eq("user_id", user.id).limit(1),
      ]);
      setTrades((t.data ?? []) as Trade[]);
      setHasMt5((m.data ?? []).length > 0);
      setLoaded(true);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.status !== "open");
    const pnls = closed.map((t) => t.pnl ?? 0);
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
    const losses = closed.filter((t) => (t.pnl ?? 0) < 0).length;
    const grossWin = pnls.filter((p) => p > 0).reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(pnls.filter((p) => p < 0).reduce((a, b) => a + b, 0));
    const net = pnls.reduce((a, b) => a + b, 0);
    const balance = 10000 + net;
    const rrs = closed.map((t) => t.rr_realized ?? 0).filter((x) => x);
    const avgRR = rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
    const winRate = wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0;
    const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;
    // Streaks
    let cur = 0, best = 0, worst = 0;
    closed.forEach((t) => {
      const r = (t.pnl ?? 0);
      if (r > 0) cur = cur > 0 ? cur + 1 : 1;
      else if (r < 0) cur = cur < 0 ? cur - 1 : -1;
      else cur = 0;
      if (cur > best) best = cur;
      if (cur < worst) worst = cur;
    });
    // Weekly / monthly
    const now = Date.now();
    const weekly = closed.filter((t) => new Date(t.closed_at ?? t.opened_at).getTime() > now - 7 * 86400000).reduce((a, t) => a + (t.pnl ?? 0), 0);
    const monthly = closed.filter((t) => new Date(t.closed_at ?? t.opened_at).getTime() > now - 30 * 86400000).reduce((a, t) => a + (t.pnl ?? 0), 0);
    // Equity curve in range
    const days = +range;
    const since = now - days * 86400000;
    const inRange = closed.filter((t) => new Date(t.closed_at ?? t.opened_at).getTime() >= since);
    let bal = 10000;
    const eq = [{ t: "Start", bal }];
    inRange.forEach((tr, i) => {
      bal += tr.pnl ?? 0;
      eq.push({ t: `#${i + 1}`, bal: +bal.toFixed(2) });
    });
    // Drawdown
    let peak = 10000, dd = 0;
    eq.forEach((p) => { peak = Math.max(peak, p.bal); dd = Math.max(dd, ((peak - p.bal) / peak) * 100); });
    return { balance, net, winRate, pf, avgRR, dd, best, worst, weekly, monthly, eq, total: closed.length };
  }, [trades, range]);

  const fmt = (n: number) => `${n < 0 ? "-" : ""}${ccy === "USD" ? "$" : ""}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}${ccy !== "USD" ? ` ${ccy}` : ""}`;

  const showConnectMT5 = loaded && !hasMt5 && trades.length === 0;

  return (
    <AppShell title="Dashboard">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h2 className="text-2xl font-semibold tracking-tight">{name}</h2>
        </div>
        <Badge variant="outline" className={hasMt5 ? "border-success/40 bg-success/10 text-success" : "border-border/60"}>{hasMt5 ? "MT5 connected" : "MT5 not connected"}</Badge>
      </div>

      {showConnectMT5 && (
        <Card className="mb-6 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-glow">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:flex-row sm:text-left">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/20 text-primary"><Cable className="h-6 w-6" /></div>
            <div className="flex-1">
              <p className="text-lg font-semibold">Connect your MT5 account</p>
              <p className="text-sm text-muted-foreground">Stream every closed trade automatically and unlock live analytics here.</p>
            </div>
            <Button asChild size="lg" className="gap-2"><Link to="/mt5"><Cable className="h-4 w-4" /> Connect MT5</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Account Balance" value={fmt(stats.balance)} sub={ccy} icon={Activity} />
        <StatCard label="Net P&L" value={fmt(stats.net)} sub="All time" icon={TrendingUp} accent={stats.net >= 0 ? "text-success" : "text-danger"} />
        <StatCard label="Total Trades" value={String(stats.total)} sub={stats.total ? "Closed trades" : "No trades yet"} icon={Target} />
        <StatCard label="Win Rate" value={stats.total ? `${stats.winRate}%` : "—"} sub={stats.total ? `${stats.winRate}% wins` : "Awaiting data"} icon={Trophy} />
        <StatCard label="Profit Factor" value={stats.pf ? stats.pf.toFixed(2) : "—"} sub="Gross win / loss" icon={TrendingUp} />
        <StatCard label="Avg RR" value={stats.avgRR ? stats.avgRR.toFixed(2) : "—"} sub="Realized" icon={Target} />
        <StatCard label="Max Drawdown" value={`${stats.dd.toFixed(1)}%`} sub="In range" icon={TrendingDown} accent={stats.dd > 10 ? "text-danger" : "text-success"} />
        <StatCard label="Best / Worst Streak" value={`${stats.best} / ${stats.worst}`} sub="Trades" icon={Flame} accent="text-accent" />
        <StatCard label="Weekly P&L" value={fmt(stats.weekly)} sub="Last 7 days" icon={Calendar} accent={stats.weekly >= 0 ? "text-success" : "text-danger"} />
        <StatCard label="Monthly P&L" value={fmt(stats.monthly)} sub="Last 30 days" icon={Calendar} accent={stats.monthly >= 0 ? "text-success" : "text-danger"} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 bg-card">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Equity Curve</h3>
              <Tabs value={range} onValueChange={(v) => setRange(v as "30" | "90" | "365")}>
                <TabsList><TabsTrigger value="30">30D</TabsTrigger><TabsTrigger value="90">90D</TabsTrigger><TabsTrigger value="365">1Y</TabsTrigger></TabsList>
              </Tabs>
            </div>
            {stats.eq.length > 1 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.eq}>
                    <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="t" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={["auto","auto"]} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                    <Area type="monotone" dataKey="bal" stroke="#6366f1" fill="url(#eq)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 rounded-lg border border-border/60 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 grid place-items-center text-sm text-muted-foreground">
                Connect MT5 or log trades to see your equity curve
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card">
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">Recent Trades</h3>
            {trades.length === 0 ? (
              <div className="grid h-56 place-items-center rounded-lg border border-dashed border-border/60 text-center text-sm text-muted-foreground">
                No trades yet.<br />Add one from the journal or connect MT5.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {trades.slice().reverse().slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                    <div>
                      <p className="font-medium">{t.pair} <span className="ml-1 text-muted-foreground uppercase">{t.direction}</span></p>
                      <p className="text-muted-foreground">{new Date(t.opened_at).toLocaleDateString()} · {t.source}</p>
                    </div>
                    <span className={`font-semibold tabular-nums ${(t.pnl ?? 0) >= 0 ? "text-success" : "text-danger"}`}>
                      {(t.pnl ?? 0) >= 0 ? "+" : ""}{fmt(t.pnl ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
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

function StatCard({ label, value, sub, icon: Icon, accent = "text-foreground" }: { label: string; value: string; sub: string; icon: React.ComponentType<{ className?: string }>; accent?: string }) {
  return (
    <Card className="border-border/60 bg-card shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={`mt-3 text-2xl font-semibold ${accent}`}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
