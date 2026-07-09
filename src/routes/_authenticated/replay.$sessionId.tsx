import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { formatMoney } from "@/lib/currencies";
import {
  computeSessionStats, computeEquityCurve, computeMaxDrawdown,
  breakdownByDay, breakdownBySymbol, breakdownByHour, dailyPnlCalendar, pnlDistribution,
  type BacktestSession, type BacktestTrade,
} from "@/lib/backtest";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { ArrowLeft, Loader2, Save, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/replay/$sessionId")({
  head: () => ({ meta: [{ title: "Session Analytics — Backtesting Station" }] }),
  component: SessionDetailPage,
});

function SessionDetailPage() {
  const { sessionId } = useParams({ from: "/_authenticated/replay/$sessionId" });
  const { user } = useAuth();
  const { profile } = useProfile();
  const ccy = profile?.account_currency ?? "USD";
  const navigate = useNavigate();

  const [session, setSession] = useState<BacktestSession | null>(null);
  const [trades, setTrades] = useState<BacktestTrade[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: s }, { data: t }] = await Promise.all([
        supabase.from("backtest_sessions").select("*").eq("id", sessionId).maybeSingle(),
        supabase.from("backtest_trades").select("*").eq("session_id", sessionId)
          .order("closed_at", { ascending: true, nullsFirst: false }),
      ]);
      setSession((s as BacktestSession) ?? null);
      setTrades((t as BacktestTrade[]) ?? []);
      setNotes((s as BacktestSession)?.notes ?? "");
      setLoading(false);
    })();
  }, [user, sessionId]);

  const stats = useMemo(() => session
    ? computeSessionStats(trades, Number(session.starting_balance))
    : null, [trades, session]);
  const equity = useMemo(() => session
    ? computeEquityCurve(trades, Number(session.starting_balance))
    : [], [trades, session]);
  const dd = useMemo(() => computeMaxDrawdown(equity), [equity]);
  const byDay = useMemo(() => breakdownByDay(trades), [trades]);
  const bySymbol = useMemo(() => breakdownBySymbol(trades), [trades]);
  const byHour = useMemo(() => breakdownByHour(trades), [trades]);
  const calendar = useMemo(() => dailyPnlCalendar(trades), [trades]);
  const dist = useMemo(() => pnlDistribution(trades), [trades]);

  async function saveNotes() {
    await supabase.from("backtest_sessions").update({ notes }).eq("id", sessionId);
    toast.success("Notes saved");
  }

  if (loading) return (
    <AppShell title="Session Analytics">
      <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    </AppShell>
  );
  if (!session) return (
    <AppShell title="Session Analytics">
      <Card><CardContent className="p-10 text-center">
        <p className="text-sm text-muted-foreground">Session not found.</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/replay" })}>Back to Station</Button>
      </CardContent></Card>
    </AppShell>
  );

  const closed = trades.filter((t) => t.status === "closed");

  return (
    <AppShell title={session.name}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/replay">
          <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
        </Link>
        <Badge variant="outline">{session.symbol} · {session.timeframe}</Badge>
        {session.status === "archived" && <Badge variant="secondary">Archived</Badge>}
        <div className="ml-auto flex items-center gap-2">
          <Link to="/backtest">
            <Button size="sm" variant="outline">Resume in Lab</Button>
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        <KPI label="Net P&L" value={formatMoney(stats!.net, ccy)} tone={stats!.net >= 0 ? "up" : "down"} />
        <KPI label="Win Rate" value={`${stats!.winRate.toFixed(1)}%`} />
        <KPI label="Profit Factor" value={stats!.pf ? stats!.pf.toFixed(2) : "—"} />
        <KPI label="Avg RR" value={stats!.meanRR ? stats!.meanRR.toFixed(2) : "—"} />
        <KPI label="Expectancy" value={formatMoney(stats!.expectancy, ccy)} />
        <KPI label="Max DD" value={`${dd.percent.toFixed(1)}%`} tone={dd.percent > 0 ? "down" : undefined} />
        <KPI label="Trades" value={String(stats!.trades)} />
        <KPI label="Wins / Losses" value={`${stats!.wins} / ${stats!.losses}`} />
        <KPI label="Gross Profit" value={formatMoney(stats!.gross, ccy)} tone="up" />
        <KPI label="Gross Loss" value={formatMoney(-stats!.grossLoss, ccy)} tone="down" />
        <KPI label="Largest Win" value={formatMoney(stats!.largestWin, ccy)} tone="up" />
        <KPI label="Largest Loss" value={formatMoney(stats!.largestLoss, ccy)} tone="down" />
      </div>

      {/* Equity curve */}
      <Card className="mt-4"><CardContent className="p-4">
        <h3 className="mb-2 text-sm font-semibold">Equity Curve</h3>
        {equity.length > 1 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={equity}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="i" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={["auto","auto"]} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                formatter={(v: number) => formatMoney(v, ccy)} />
              <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <Empty label="No closed trades yet." />}
      </CardContent></Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* P&L Distribution */}
        <Card><CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold">P&L Distribution</h3>
          {dist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dist}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="from" stroke="hsl(var(--muted-foreground))" fontSize={10}
                  tickFormatter={(v) => formatMoney(v, ccy)} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty label="No data yet." />}
        </CardContent></Card>

        {/* Day-of-week breakdown */}
        <Card><CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold">By Day of Week</h3>
          {byDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byDay}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="key" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => formatMoney(v, ccy)} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                  formatter={(v: number) => formatMoney(v, ccy)} />
                <Bar dataKey="pnl" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty label="No data yet." />}
        </CardContent></Card>

        {/* By symbol */}
        <Card><CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold">By Symbol</h3>
          {bySymbol.length > 0 ? (
            <div className="space-y-1.5">
              {bySymbol.map((r) => (
                <div key={String(r.key)} className="flex items-center gap-2 text-xs">
                  <span className="w-16 font-semibold">{r.key}</span>
                  <span className="text-muted-foreground">{r.count} trades · {((r.wins / r.count) * 100).toFixed(0)}%</span>
                  <span className={cn("ml-auto font-semibold", r.pnl >= 0 ? "text-success" : "text-destructive")}>
                    {formatMoney(r.pnl, ccy)}
                  </span>
                </div>
              ))}
            </div>
          ) : <Empty label="No data yet." />}
        </CardContent></Card>

        {/* By hour */}
        <Card><CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold">By Hour (UTC)</h3>
          {byHour.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byHour}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="key" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => formatMoney(v, ccy)} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                  formatter={(v: number) => formatMoney(v, ccy)} />
                <Bar dataKey="pnl" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty label="No data yet." />}
        </CardContent></Card>
      </div>

      {/* Calendar heatmap */}
      <Card className="mt-4"><CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Daily P&L Calendar</h3>
        <CalendarHeatmap data={calendar} ccy={ccy} />
      </CardContent></Card>

      {/* Notes */}
      <Card className="mt-4"><CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Session Notes</h3>
          <Button size="sm" variant="outline" className="gap-1" onClick={saveNotes}>
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
        <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="What worked? What went wrong? Setups to repeat…" />
      </CardContent></Card>

      {/* Trade list */}
      <Card className="mt-4"><CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Trade Log ({closed.length})</h3>
        {closed.length === 0 ? <Empty label="No closed trades yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="p-1 text-left">Symbol</th>
                  <th className="p-1 text-left">Dir</th>
                  <th className="p-1 text-right">Lots</th>
                  <th className="p-1 text-right">Entry</th>
                  <th className="p-1 text-right">Exit</th>
                  <th className="p-1 text-right">RR</th>
                  <th className="p-1 text-right">P&L</th>
                  <th className="p-1 text-left">Reason</th>
                  <th className="p-1 text-left">Closed</th>
                </tr>
              </thead>
              <tbody>
                {closed.map((t) => (
                  <tr key={t.id} className="border-t border-border/60">
                    <td className="p-1 font-semibold">{t.symbol}</td>
                    <td className="p-1">
                      {t.direction === "long"
                        ? <TrendingUp className="inline h-3 w-3 text-success" />
                        : <TrendingDown className="inline h-3 w-3 text-destructive" />} {t.direction}
                    </td>
                    <td className="p-1 text-right">{t.lots}</td>
                    <td className="p-1 text-right font-mono">{t.entry?.toFixed(5)}</td>
                    <td className="p-1 text-right font-mono">{t.exit?.toFixed(5)}</td>
                    <td className="p-1 text-right">{t.rr != null ? `${t.rr.toFixed(2)}R` : "—"}</td>
                    <td className={cn("p-1 text-right font-semibold", (t.pnl ?? 0) >= 0 ? "text-success" : "text-destructive")}>
                      {formatMoney(t.pnl ?? 0, ccy)}
                    </td>
                    <td className="p-1 text-muted-foreground">{t.exit_reason ?? "—"}</td>
                    <td className="p-1 text-muted-foreground">{t.closed_at ? new Date(t.closed_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>

      {/* Future hooks */}
      <Card className="mt-4 border-dashed"><CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Summary & Mistake Detection</h3>
          <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Automatic detection of common mistakes (overtrading, over-risking, hesitation, missed TPs) and an AI-generated performance review will land here.
        </p>
      </CardContent></Card>
    </AppShell>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-bold",
        tone === "up" && "text-success", tone === "down" && "text-destructive")}>{value}</p>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="py-6 text-center text-xs text-muted-foreground">{label}</p>;
}

function CalendarHeatmap({ data, ccy }: { data: Record<string, number>; ccy: string }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <Empty label="No trading days recorded yet." />;
  const max = Math.max(...entries.map(([, v]) => Math.abs(v))) || 1;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([d, v]) => {
        const intensity = Math.min(1, Math.abs(v) / max);
        const bg = v > 0
          ? `color-mix(in oklab, hsl(var(--success)) ${20 + intensity * 60}%, transparent)`
          : v < 0
            ? `color-mix(in oklab, hsl(var(--destructive)) ${20 + intensity * 60}%, transparent)`
            : "hsl(var(--muted) / 0.4)";
        return (
          <div key={d}
            title={`${d}: ${formatMoney(v, ccy)}`}
            className="grid h-10 w-16 place-items-center rounded border border-border/40 text-[10px]"
            style={{ background: bg }}>
            <span className="font-mono">{d.slice(5)}</span>
            <span className="font-semibold">{v > 0 ? "+" : ""}{v.toFixed(0)}</span>
          </div>
        );
      })}
    </div>
  );
}