import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { formatMoney } from "@/lib/currencies";
import { computeSessionStats, type BacktestSession, type BacktestTrade } from "@/lib/backtest";
import { Search, FlaskConical, ChevronRight, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/replay")({
  head: () => ({ meta: [
    { title: "Backtesting Station — Traders Toolkit" },
    { name: "description", content: "Every backtesting session with equity curves, drawdowns, breakdowns and full performance analytics." },
  ] }),
  component: BacktestStationList,
});

type Row = BacktestSession & { _trades: BacktestTrade[]; _stats: ReturnType<typeof computeSessionStats> };

function BacktestStationList() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const accountCurrency = profile?.account_currency ?? "USD";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"active" | "archived">("active");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: sessions } = await supabase
        .from("backtest_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("last_opened_at", { ascending: false });
      const list = (sessions as BacktestSession[]) ?? [];
      const ids = list.map((s) => s.id);
      const { data: allTrades } = ids.length
        ? await supabase.from("backtest_trades").select("*").in("session_id", ids)
        : { data: [] as BacktestTrade[] };
      const tradesBySession = new Map<string, BacktestTrade[]>();
      for (const t of (allTrades as BacktestTrade[]) ?? []) {
        const arr = tradesBySession.get(t.session_id) ?? [];
        arr.push(t); tradesBySession.set(t.session_id, arr);
      }
      setRows(list.map((s) => {
        const trades = tradesBySession.get(s.id) ?? [];
        return { ...s, _trades: trades, _stats: computeSessionStats(trades, Number(s.starting_balance)) };
      }));
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => r.status === tab).filter((r) =>
      !needle || r.name.toLowerCase().includes(needle) || r.symbol.toLowerCase().includes(needle),
    );
  }, [rows, q, tab]);

  const activeCount = rows.filter((r) => r.status === "active").length;
  const archivedCount = rows.filter((r) => r.status === "archived").length;

  return (
    <AppShell title="Backtesting Station">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">Every session you've traded. Click one to review performance in detail.</p>
        <Link to="/backtest" className="ml-auto">
          <Button size="sm" className="gap-1"><FlaskConical className="h-4 w-4" /> Open Backtesting Lab</Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "archived")}>
          <TabsList>
            <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({archivedCount})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or symbol" className="pl-8" />
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-muted-foreground">
          {q ? "No sessions match that search." : tab === "active"
            ? "No sessions yet. Head to the Backtesting Lab to start practicing."
            : "No archived sessions."}
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Link key={r.id} to="/replay/$sessionId" params={{ sessionId: r.id }}>
              <Card className="group cursor-pointer transition hover:border-primary/40 hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.symbol} · {r.timeframe} · {new Date(r.last_opened_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <Mini label="Trades" value={String(r._stats.trades)} />
                    <Mini label="Win %" value={`${r._stats.winRate.toFixed(0)}%`} />
                    <Mini label="PF" value={r._stats.pf ? r._stats.pf.toFixed(2) : "—"} />
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded border border-border/60 bg-card/40 px-2 py-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Net P&L</span>
                    <span className={cn("flex items-center gap-1 text-sm font-bold",
                      r._stats.net >= 0 ? "text-success" : "text-destructive")}>
                      {r._stats.net >= 0
                        ? <TrendingUp className="h-3 w-3" />
                        : <TrendingDown className="h-3 w-3" />}
                      {formatMoney(r._stats.net, accountCurrency)}
                    </span>
                  </div>
                  {r.status === "archived" && (
                    <Badge variant="secondary" className="mt-2 text-[10px]">Archived</Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 bg-card/40 px-2 py-1 text-center">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}