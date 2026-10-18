import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Tradivo" }] }),
  component: AnalyticsPage,
});

type T = {
  id: string;
  pair: string;
  session: string | null;
  smc_tags: string[];
  pnl: number | null;
  rr_realized: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
};

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

function AnalyticsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<T[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("trades").select("id,pair,session,smc_tags,pnl,rr_realized,status,opened_at,closed_at").eq("user_id", user.id).order("opened_at").then(({ data }) => setRows((data ?? []) as T[]));
  }, [user]);

  const closed = useMemo(() => rows.filter((r) => r.status !== "open"), [rows]);

  const equity = useMemo(() => {
    let cum = 0;
    return closed.map((r) => ({ date: new Date(r.closed_at ?? r.opened_at).toLocaleDateString(), pnl: (cum += Number(r.pnl ?? 0)) }));
  }, [closed]);

  const bySession = useMemo(() => {
    const map = new Map<string, number>();
    closed.forEach((r) => map.set(r.session ?? "Unknown", (map.get(r.session ?? "Unknown") ?? 0) + Number(r.pnl ?? 0)));
    return [...map.entries()].map(([name, pnl]) => ({ name, pnl: Number(pnl.toFixed(2)) }));
  }, [closed]);

  const byPair = useMemo(() => {
    const map = new Map<string, number>();
    closed.forEach((r) => map.set(r.pair, (map.get(r.pair) ?? 0) + Number(r.pnl ?? 0)));
    return [...map.entries()].map(([name, pnl]) => ({ name, pnl: Number(pnl.toFixed(2)) })).sort((a, b) => b.pnl - a.pnl).slice(0, 8);
  }, [closed]);

  const tagStats = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number }>();
    closed.forEach((r) => {
      r.smc_tags.forEach((t) => {
        const m = map.get(t) ?? { wins: 0, losses: 0 };
        if (r.status === "win") m.wins++;
        else if (r.status === "loss") m.losses++;
        map.set(t, m);
      });
    });
    return [...map.entries()].map(([name, v]) => ({ name, winRate: v.wins + v.losses ? Math.round((v.wins / (v.wins + v.losses)) * 100) : 0, total: v.wins + v.losses })).filter(t => t.total > 0).sort((a,b)=>b.winRate-a.winRate);
  }, [closed]);

  const wlPie = useMemo(() => {
    const w = closed.filter((r) => r.status === "win").length;
    const l = closed.filter((r) => r.status === "loss").length;
    const b = closed.filter((r) => r.status === "breakeven").length;
    return [
      { name: "Wins", value: w },
      { name: "Losses", value: l },
      { name: "BE", value: b },
    ];
  }, [closed]);

  return (
    <AppShell title="Analytics">
      {closed.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">Close some trades in your journal to see analytics.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <p className="mb-4 text-sm font-medium text-muted-foreground">Equity Curve</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={equity}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="pnl" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <p className="mb-4 text-sm font-medium text-muted-foreground">P&L by Session</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={bySession}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="pnl" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="mb-4 text-sm font-medium text-muted-foreground">Win / Loss Distribution</p>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={wlPie} dataKey="value" nameKey="name" outerRadius={80} label>
                      {wlPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6">
              <p className="mb-4 text-sm font-medium text-muted-foreground">Top Pairs by P&L</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byPair}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="pnl" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="mb-4 text-sm font-medium text-muted-foreground">SMC Tag Win Rate</p>
              {tagStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tag your trades with SMC concepts to see performance per pattern.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {tagStats.map((t) => (
                    <div key={t.name} className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-2">
                      <span className="text-sm">{t.name} <span className="text-xs text-muted-foreground">({t.total})</span></span>
                      <span className={`text-sm font-semibold ${t.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>{t.winRate}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}