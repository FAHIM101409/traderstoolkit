import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TradingViewChart, TV_SYMBOLS, TV_INTERVALS } from "@/components/app/tradingview-chart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { UpgradeDialog } from "@/components/app/upgrade-dialog";
import { formatMoney } from "@/lib/currencies";
import { INSTRUMENT_SPECS, getSpec, calculatePosition } from "@/lib/instruments";
import {
  computePnl, computeRR, computeSessionStats,
  type BacktestSession, type BacktestTrade,
} from "@/lib/backtest";
import { toast } from "sonner";
import {
  Maximize2, Minimize2, TrendingUp, TrendingDown, Plus, MoreVertical,
  Archive, Copy, Trash2, Download, PencilLine, X, Loader2, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/backtest")({
  head: () => ({ meta: [
    { title: "Backtesting Lab — Traders Toolkit" },
    { name: "description", content: "Professional trading simulator with TradingView charts, MT5-style order execution, session tracking and full analytics." },
  ] }),
  component: BacktestPage,
});

const FREE_SESSION_LIMIT = 2;

// Map our internal symbols to TradingView tickers.
const TV_MAP: Record<string, string> = {
  EURUSD: "FX:EURUSD", GBPUSD: "FX:GBPUSD", USDJPY: "FX:USDJPY", USDCHF: "FX:USDCHF",
  USDCAD: "FX:USDCAD", AUDUSD: "FX:AUDUSD", NZDUSD: "FX:NZDUSD",
  XAUUSD: "OANDA:XAUUSD", XAGUSD: "OANDA:XAGUSD",
  BTCUSD: "BINANCE:BTCUSDT", ETHUSD: "BINANCE:ETHUSDT", SOLUSD: "BINANCE:SOLUSDT",
  NAS100: "OANDA:NAS100USD", SPX500: "OANDA:SPX500USD", US30: "OANDA:US30USD",
  GER40: "OANDA:DE30EUR", UK100: "OANDA:UK100GBP", USOIL: "OANDA:WTICOUSD", UKOIL: "OANDA:BCOUSD",
};
function toTV(symbol: string): string {
  return TV_MAP[symbol] ?? `FX:${symbol}`;
}
function fromTV(tv: string): string {
  const found = Object.entries(TV_MAP).find(([, v]) => v === tv);
  return found?.[0] ?? tv.split(":").pop()?.replace("USDT", "USD") ?? "EURUSD";
}

function BacktestPage() {
  const { user } = useAuth();
  const { profile, isPro } = useProfile();
  const accountCurrency = profile?.account_currency ?? "USD";

  const [sessions, setSessions] = useState<BacktestSession[]>([]);
  const [active, setActive] = useState<BacktestSession | null>(null);
  const [trades, setTrades] = useState<BacktestTrade[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  // Load sessions
  const loadSessions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("backtest_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("last_opened_at", { ascending: false });
    setSessions((data as BacktestSession[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  // Auto-open picker when no active session
  useEffect(() => {
    if (!loading && !active) setPickerOpen(true);
  }, [loading, active]);

  // Load trades for active session
  const loadTrades = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from("backtest_trades")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    setTrades((data as BacktestTrade[]) ?? []);
  }, []);

  async function openSession(s: BacktestSession) {
    setActive(s);
    setPickerOpen(false);
    await supabase.from("backtest_sessions").update({ last_opened_at: new Date().toISOString() }).eq("id", s.id);
    await loadTrades(s.id);
  }

  async function createSession(name: string, symbol: string, timeframe: string, startingBalance: number) {
    if (!user) return;
    const activeCount = sessions.filter((s) => s.status === "active").length;
    if (!isPro && activeCount >= FREE_SESSION_LIMIT) {
      setUpgradeOpen(true);
      return;
    }
    const { data, error } = await supabase.from("backtest_sessions").insert({
      user_id: user.id, name, symbol, timeframe,
      starting_balance: startingBalance, ending_balance: startingBalance,
      status: "active",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await loadSessions();
    await openSession(data as BacktestSession);
    toast.success("Session created");
  }

  async function renameSession(name: string) {
    if (!active) return;
    await supabase.from("backtest_sessions").update({ name }).eq("id", active.id);
    setActive({ ...active, name });
    await loadSessions();
  }
  async function duplicateSession() {
    if (!active || !user) return;
    const activeCount = sessions.filter((s) => s.status === "active").length;
    if (!isPro && activeCount >= FREE_SESSION_LIMIT) { setUpgradeOpen(true); return; }
    const { data } = await supabase.from("backtest_sessions").insert({
      user_id: user.id, name: `${active.name} (copy)`,
      symbol: active.symbol, timeframe: active.timeframe,
      starting_balance: active.starting_balance, ending_balance: active.starting_balance,
      status: "active",
    }).select().single();
    if (data) { toast.success("Duplicated"); await loadSessions(); await openSession(data as BacktestSession); }
  }
  async function archiveSession() {
    if (!active) return;
    await supabase.from("backtest_sessions").update({ status: "archived" }).eq("id", active.id);
    toast.success("Session archived");
    setActive(null); setTrades([]);
    await loadSessions();
  }
  async function deleteSession() {
    if (!active) return;
    if (!confirm(`Delete session "${active.name}"? This removes all its trades.`)) return;
    await supabase.from("backtest_sessions").delete().eq("id", active.id);
    toast.success("Session deleted");
    setActive(null); setTrades([]);
    await loadSessions();
  }
  function exportSession() {
    if (!active) return;
    const blob = new Blob([JSON.stringify({ session: active, trades }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${active.name}.backtest.json`; a.click();
    URL.revokeObjectURL(url);
  }

  // Fullscreen
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  async function toggleFullscreen() {
    const el = shellRef.current;
    if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }

  const stats = useMemo(() => active
    ? computeSessionStats(trades, Number(active.starting_balance))
    : null, [trades, active]);

  const body = (
    <div ref={shellRef} className={cn("space-y-4", isFullscreen && "h-screen w-screen overflow-auto bg-background p-4")}>
      {active && (
        <SessionBar
          session={active}
          stats={stats}
          accountCurrency={accountCurrency}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onChangeSession={() => setPickerOpen(true)}
          onRename={() => setRenameOpen(true)}
          onDuplicate={duplicateSession}
          onArchive={archiveSession}
          onDelete={deleteSession}
          onExport={exportSession}
        />
      )}

      {active && (
        <TradingWorkspace
          session={active}
          trades={trades}
          accountCurrency={accountCurrency}
          startingBalance={Number(active.starting_balance)}
          onTradesChanged={() => loadTrades(active.id)}
          userId={user?.id ?? ""}
          onSymbolChanged={async (sym) => {
            await supabase.from("backtest_sessions").update({ symbol: sym }).eq("id", active.id);
            setActive({ ...active, symbol: sym });
          }}
          onTimeframeChanged={async (tf) => {
            await supabase.from("backtest_sessions").update({ timeframe: tf }).eq("id", active.id);
            setActive({ ...active, timeframe: tf });
          }}
        />
      )}

      {!active && !loading && (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <p className="text-muted-foreground">No session selected.</p>
            <Button className="mt-4" onClick={() => setPickerOpen(true)}>Select or create a session</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <>
      {isFullscreen ? body : <AppShell title="Backtesting Lab">{body}</AppShell>}

      <SessionPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        sessions={sessions}
        loading={loading}
        onResume={openSession}
        onCreate={() => { setPickerOpen(false); setCreateOpen(true); }}
        isPro={isPro}
        limit={FREE_SESSION_LIMIT}
        onUpgrade={() => setUpgradeOpen(true)}
      />

      <CreateSessionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={createSession}
        defaultCurrency={accountCurrency}
      />

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        initial={active?.name ?? ""}
        onSave={(n) => { void renameSession(n); setRenameOpen(false); }}
      />

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}

// ============================================================================
// Session Bar
// ============================================================================
function SessionBar({
  session, stats, accountCurrency, isFullscreen,
  onToggleFullscreen, onChangeSession, onRename, onDuplicate, onArchive, onDelete, onExport,
}: {
  session: BacktestSession;
  stats: ReturnType<typeof computeSessionStats> | null;
  accountCurrency: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onChangeSession: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const bal = stats?.endingBalance ?? Number(session.starting_balance);
  const net = stats?.net ?? 0;
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-wrap items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{session.name}</p>
            <Badge variant="outline" className="text-[10px]">{session.symbol} · {session.timeframe}</Badge>
            {session.status === "archived" && <Badge variant="secondary" className="text-[10px]">Archived</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Start {formatMoney(Number(session.starting_balance), accountCurrency)} ·
            {" "}{stats?.trades ?? 0} trades · WR {stats ? stats.winRate.toFixed(0) : 0}%
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs">
          <Stat l="Balance" v={formatMoney(bal, accountCurrency)} />
          <Stat l="Net P&L" v={formatMoney(net, accountCurrency)} tone={net >= 0 ? "up" : "down"} />
          <Stat l="PF" v={stats?.pf ? stats.pf.toFixed(2) : "—"} />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={onChangeSession}>Change</Button>
          <Button variant="outline" size="sm" onClick={onToggleFullscreen} title="Fullscreen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}><PencilLine className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}><Download className="mr-2 h-4 w-4" /> Export JSON</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchive}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ l, v, tone }: { l: string; v: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 px-2 py-1 text-right">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
      <p className={cn("text-sm font-semibold", tone === "up" && "text-success", tone === "down" && "text-destructive")}>{v}</p>
    </div>
  );
}

// ============================================================================
// Trading Workspace (chart + trade panel + positions dock)
// ============================================================================
function TradingWorkspace({
  session, trades, accountCurrency, startingBalance, userId,
  onTradesChanged, onSymbolChanged, onTimeframeChanged,
}: {
  session: BacktestSession;
  trades: BacktestTrade[];
  accountCurrency: string;
  startingBalance: number;
  userId: string;
  onTradesChanged: () => void;
  onSymbolChanged: (s: string) => void;
  onTimeframeChanged: (t: string) => void;
}) {
  const spec = getSpec(session.symbol);
  const [markPrice, setMarkPrice] = useState<number>(spec.referencePrice);
  useEffect(() => { setMarkPrice(getSpec(session.symbol).referencePrice); }, [session.symbol]);

  const stats = useMemo(() => computeSessionStats(trades, startingBalance), [trades, startingBalance]);
  const currentBalance = stats.endingBalance;

  // Order form state
  const [side, setSide] = useState<"long" | "short">("long");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop">("market");
  const [lots, setLots] = useState<string>("0.10");
  const [riskPct, setRiskPct] = useState<string>("1");
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [sl, setSl] = useState<string>("");
  const [tp, setTp] = useState<string>("");
  const [sizingMode, setSizingMode] = useState<"lots" | "risk">("lots");

  // Auto-compute lots from risk %
  useEffect(() => {
    if (sizingMode !== "risk") return;
    const risk = +riskPct;
    const slN = +sl;
    const entryN = orderType === "market" ? markPrice : +entryPrice;
    if (!risk || !slN || !entryN) return;
    const dist = Math.abs(entryN - slN);
    if (!dist) return;
    const res = calculatePosition({
      spec, accountCurrency,
      riskAmountAccountCcy: currentBalance * (risk / 100),
      priceDistance: dist,
    });
    if (res.lots > 0) setLots(res.lots.toFixed(2));
  }, [sizingMode, riskPct, sl, entryPrice, markPrice, orderType, spec, accountCurrency, currentBalance]);

  function place() {
    const lotsN = +lots;
    const slN = +sl || null;
    const tpN = +tp || null;
    const entryN = orderType === "market" ? markPrice : +entryPrice;

    if (!lotsN || lotsN < spec.minLot) { toast.error(`Lot size must be at least ${spec.minLot}`); return; }
    if (!entryN) { toast.error("Entry price required"); return; }
    if (slN && ((side === "long" && slN >= entryN) || (side === "short" && slN <= entryN))) {
      toast.error("Stop loss on the wrong side of entry"); return;
    }
    if (tpN && ((side === "long" && tpN <= entryN) || (side === "short" && tpN >= entryN))) {
      toast.error("Take profit on the wrong side of entry"); return;
    }

    const now = new Date().toISOString();
    const rr = slN && tpN ? computeRR(side, entryN, slN, tpN) : null;
    const riskAmount = slN
      ? computePnl(spec, side === "long" ? "short" : "long", entryN, slN, lotsN, accountCurrency) * -1
      : null;

    void supabase.from("backtest_trades").insert({
      session_id: session.id, user_id: userId,
      symbol: session.symbol, direction: side, order_type: orderType,
      status: orderType === "market" ? "open" : "pending",
      entry: entryN, sl: slN, tp: tpN, lots: lotsN,
      risk_pct: +riskPct || null,
      risk_amount: riskAmount,
      rr,
      opened_at: orderType === "market" ? now : null,
    }).then(({ error }) => {
      if (error) { toast.error(error.message); return; }
      toast.success(orderType === "market" ? "Position opened" : "Pending order placed");
      setEntryPrice(""); setSl(""); setTp("");
      onTradesChanged();
    });
  }

  const openTrades = trades.filter((t) => t.status === "open");
  const pending = trades.filter((t) => t.status === "pending");
  const history = trades.filter((t) => t.status === "closed" || t.status === "cancelled");

  const floatingPnl = openTrades.reduce(
    (s, t) => s + (t.entry ? computePnl(getSpec(t.symbol), t.direction, t.entry, markPrice, t.lots, accountCurrency) : 0),
    0,
  );

  return (
    <>
      {/* Trading toolbar */}
      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground">Instrument</Label>
            <Select value={session.symbol} onValueChange={onSymbolChanged}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INSTRUMENT_SPECS.map((i) => (
                  <SelectItem key={i.symbol} value={i.symbol}>{i.group} · {i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 rounded-md border border-border/60 p-1">
              {TV_INTERVALS.map((tf) => (
                <Button
                  key={tf.value}
                  size="sm"
                  variant={session.timeframe === tf.value ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => onTimeframeChanged(tf.value)}
                >{tf.label}</Button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Mark price</Label>
              <Input
                type="number" step="any" value={markPrice}
                onChange={(e) => setMarkPrice(+e.target.value)}
                className="h-8 w-32"
              />
              <Badge variant={floatingPnl >= 0 ? "default" : "destructive"} className="whitespace-nowrap">
                Floating {formatMoney(floatingPnl, accountCurrency)}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-[auto_auto_1fr_1fr_1fr_1fr_auto_auto]">
            <div>
              <Label className="text-[11px] text-muted-foreground">Type</Label>
              <Select value={orderType} onValueChange={(v) => setOrderType(v as any)}>
                <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                  <SelectItem value="stop">Stop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Sizing</Label>
              <Select value={sizingMode} onValueChange={(v) => setSizingMode(v as any)}>
                <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lots">Fixed lots</SelectItem>
                  <SelectItem value="risk">Auto from risk %</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Lots</Label>
              <Input type="number" step="0.01" value={lots} onChange={(e) => setLots(e.target.value)} disabled={sizingMode === "risk"} className="h-9" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Risk %</Label>
              <Input type="number" step="0.1" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} className="h-9" />
            </div>
            {orderType !== "market" && (
              <div>
                <Label className="text-[11px] text-muted-foreground">Entry</Label>
                <Input type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className="h-9" />
              </div>
            )}
            <div>
              <Label className="text-[11px] text-muted-foreground">Stop Loss</Label>
              <Input type="number" step="any" value={sl} onChange={(e) => setSl(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Take Profit</Label>
              <Input type="number" step="any" value={tp} onChange={(e) => setTp(e.target.value)} className="h-9" />
            </div>
            <div className="flex gap-2">
              <Button className="h-9 bg-success text-success-foreground hover:bg-success/90" onClick={() => { setSide("long"); place(); }}>
                <TrendingUp className="mr-1 h-4 w-4" /> {orderType === "market" ? "Buy" : `Buy ${orderType}`}
              </Button>
              <Button className="h-9 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setSide("short"); place(); }}>
                <TrendingDown className="mr-1 h-4 w-4" /> {orderType === "market" ? "Sell" : `Sell ${orderType}`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart + dock */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-md border border-border/60 bg-[#0b0b12]">
          <TradingViewChart symbol={toTV(session.symbol)} interval={session.timeframe} height="min(75vh, 720px)" />
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-3">
            <Tabs defaultValue="open">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="open">Open ({openTrades.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
                <TabsTrigger value="history">History ({history.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="open" className="mt-2 space-y-2">
                {openTrades.length === 0 && <EmptyDock label="No open positions" />}
                {openTrades.map((t) => (
                  <OpenTradeCard
                    key={t.id} trade={t} spec={getSpec(t.symbol)} markPrice={markPrice}
                    accountCurrency={accountCurrency} onChanged={onTradesChanged}
                  />
                ))}
              </TabsContent>
              <TabsContent value="pending" className="mt-2 space-y-2">
                {pending.length === 0 && <EmptyDock label="No pending orders" />}
                {pending.map((t) => (
                  <PendingCard key={t.id} trade={t} accountCurrency={accountCurrency} onChanged={onTradesChanged} markPrice={markPrice} />
                ))}
              </TabsContent>
              <TabsContent value="history" className="mt-2 space-y-2">
                {history.length === 0 && <EmptyDock label="No closed trades yet" />}
                {history.map((t) => (
                  <div key={t.id} className="rounded-md border border-border/60 bg-card/40 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {t.direction === "long" ? "▲" : "▼"} {t.symbol} · {t.lots} lots
                      </span>
                      <span className={cn("font-semibold", t.pnl >= 0 ? "text-success" : "text-destructive")}>
                        {formatMoney(t.pnl, accountCurrency)}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {t.entry?.toFixed(spec.digits)} → {t.exit?.toFixed(spec.digits)} · {t.exit_reason ?? "manual"}
                      {t.rr != null && ` · ${t.rr.toFixed(2)}R`}
                    </p>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function EmptyDock({ label }: { label: string }) {
  return <p className="py-8 text-center text-xs text-muted-foreground">{label}</p>;
}

// ============================================================================
// Open trade card — modify SL/TP, close, close 50%, break even
// ============================================================================
function OpenTradeCard({
  trade, spec, markPrice, accountCurrency, onChanged,
}: {
  trade: BacktestTrade;
  spec: ReturnType<typeof getSpec>;
  markPrice: number;
  accountCurrency: string;
  onChanged: () => void;
}) {
  const [sl, setSl] = useState(trade.sl?.toString() ?? "");
  const [tp, setTp] = useState(trade.tp?.toString() ?? "");

  const pnl = trade.entry
    ? computePnl(spec, trade.direction, trade.entry, markPrice, trade.lots, accountCurrency)
    : 0;

  async function saveSlTp() {
    await supabase.from("backtest_trades").update({ sl: +sl || null, tp: +tp || null }).eq("id", trade.id);
    toast.success("SL/TP updated");
    onChanged();
  }
  async function closeAt(exit: number, reason: string, lotsClosed?: number) {
    const lots = lotsClosed ?? trade.lots;
    const pnlClose = trade.entry
      ? computePnl(spec, trade.direction, trade.entry, exit, lots, accountCurrency)
      : 0;
    const closed_at = new Date().toISOString();
    const duration = trade.opened_at
      ? Math.max(0, Math.round((Date.parse(closed_at) - Date.parse(trade.opened_at)) / 1000))
      : null;
    if (lotsClosed && lotsClosed < trade.lots) {
      // Partial: close portion as new closed trade, reduce original lots
      const remaining = +(trade.lots - lotsClosed).toFixed(2);
      await supabase.from("backtest_trades").insert({
        session_id: trade.session_id, user_id: trade.user_id,
        symbol: trade.symbol, direction: trade.direction, order_type: "market",
        status: "closed", entry: trade.entry, sl: trade.sl, tp: trade.tp,
        exit, exit_reason: reason, lots: lotsClosed, risk_pct: trade.risk_pct,
        risk_amount: trade.risk_amount, rr: trade.rr, pnl: pnlClose,
        opened_at: trade.opened_at, closed_at, duration_sec: duration,
      });
      await supabase.from("backtest_trades").update({ lots: remaining }).eq("id", trade.id);
      toast.success(`Closed ${lotsClosed} lots`);
    } else {
      await supabase.from("backtest_trades").update({
        status: "closed", exit, exit_reason: reason, pnl: pnlClose,
        closed_at, duration_sec: duration,
      }).eq("id", trade.id);
      toast.success("Position closed");
    }
    onChanged();
  }
  async function moveToBE() {
    if (!trade.entry) return;
    await supabase.from("backtest_trades").update({ sl: trade.entry }).eq("id", trade.id);
    setSl(String(trade.entry));
    toast.success("Stop moved to break-even");
    onChanged();
  }

  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {trade.direction === "long" ? <TrendingUp className="mr-1 inline h-3 w-3 text-success" /> : <TrendingDown className="mr-1 inline h-3 w-3 text-destructive" />}
          {trade.symbol} · {trade.lots} lots
        </span>
        <span className={cn("font-semibold", pnl >= 0 ? "text-success" : "text-destructive")}>
          {formatMoney(pnl, accountCurrency)}
        </span>
      </div>
      <p className="mt-1 text-muted-foreground">Entry {trade.entry?.toFixed(spec.digits)}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">SL</Label>
          <Input type="number" step="any" value={sl} onChange={(e) => setSl(e.target.value)} className="h-7" />
        </div>
        <div>
          <Label className="text-[10px]">TP</Label>
          <Input type="number" step="any" value={tp} onChange={(e) => setTp(e.target.value)} className="h-7" />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={saveSlTp}>Modify</Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={moveToBE}>BE</Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]"
          onClick={() => closeAt(markPrice, "manual", +(trade.lots / 2).toFixed(2))}
          disabled={trade.lots < 0.02}>50%</Button>
        <Button size="sm" className="h-7 px-2 text-[11px]" onClick={() => closeAt(markPrice, "manual")}>
          Close
        </Button>
      </div>
    </div>
  );
}

function PendingCard({
  trade, accountCurrency, onChanged, markPrice,
}: {
  trade: BacktestTrade;
  accountCurrency: string;
  onChanged: () => void;
  markPrice: number;
}) {
  const spec = getSpec(trade.symbol);
  async function fill() {
    const now = new Date().toISOString();
    await supabase.from("backtest_trades").update({
      status: "open", opened_at: now, entry: trade.entry,
    }).eq("id", trade.id);
    toast.success("Order filled");
    onChanged();
  }
  async function cancel() {
    await supabase.from("backtest_trades").update({
      status: "cancelled", exit_reason: "cancelled",
    }).eq("id", trade.id);
    toast.success("Order cancelled");
    onChanged();
  }
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {trade.direction === "long" ? "▲" : "▼"} {trade.symbol} · {trade.order_type} · {trade.lots} lots
        </span>
      </div>
      <p className="mt-1 text-muted-foreground">
        Entry {trade.entry?.toFixed(spec.digits)} · SL {trade.sl?.toFixed(spec.digits) ?? "—"} · TP {trade.tp?.toFixed(spec.digits) ?? "—"}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        Mark {markPrice.toFixed(spec.digits)} · {accountCurrency}
      </p>
      <div className="mt-2 flex gap-1">
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={fill}>Fill now</Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-destructive" onClick={cancel}>
          <X className="mr-1 h-3 w-3" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Session Picker
// ============================================================================
function SessionPickerDialog({
  open, onOpenChange, sessions, loading, onResume, onCreate,
  isPro, limit, onUpgrade,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sessions: BacktestSession[];
  loading: boolean;
  onResume: (s: BacktestSession) => void;
  onCreate: () => void;
  isPro: boolean;
  limit: number;
  onUpgrade: () => void;
}) {
  const active = sessions.filter((s) => s.status === "active");
  const archived = sessions.filter((s) => s.status === "archived");
  const [showArchived, setShowArchived] = useState(false);
  const list = showArchived ? archived : active;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select a Backtesting Session</DialogTitle>
          <DialogDescription>
            {isPro
              ? "Resume any session or create a new one. Every trade you take is tracked separately per session."
              : `Free plan includes ${limit} active sessions. Archive or delete a session to free a slot.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={showArchived ? "outline" : "secondary"} onClick={() => setShowArchived(false)}>
            Active ({active.length})
          </Button>
          <Button size="sm" variant={showArchived ? "secondary" : "outline"} onClick={() => setShowArchived(true)}>
            Archived ({archived.length})
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {!isPro && (
              <Button size="sm" variant="outline" onClick={onUpgrade} className="gap-1">
                <Sparkles className="h-3 w-3 text-primary" /> Unlock unlimited
              </Button>
            )}
            <Button size="sm" onClick={() => {
              if (!isPro && active.length >= limit) { onUpgrade(); return; }
              onCreate();
            }}>
              <Plus className="mr-1 h-4 w-4" /> New session
            </Button>
          </div>
        </div>
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {loading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
          {!loading && list.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {showArchived ? "No archived sessions." : "No active sessions yet. Create your first one."}
            </p>
          )}
          {list.map((s) => (
            <button
              key={s.id} onClick={() => onResume(s)}
              className="flex w-full items-center gap-3 rounded-md border border-border/60 bg-card/40 p-3 text-left transition hover:border-primary/40 hover:bg-card"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.symbol} · {s.timeframe} · started {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">Resume</Badge>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Create Session Dialog
// ============================================================================
function CreateSessionDialog({
  open, onOpenChange, onCreate, defaultCurrency,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (name: string, symbol: string, timeframe: string, startingBalance: number) => void;
  defaultCurrency: string;
}) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("60");
  const [balance, setBalance] = useState("10000");
  useEffect(() => { if (open) { setName(""); setSymbol("EURUSD"); setTimeframe("60"); setBalance("10000"); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Backtesting Session</DialogTitle>
          <DialogDescription>Every trade you take will be recorded to this session automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Session name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gold May 2026 — SMC" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Instrument</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSTRUMENT_SPECS.map((i) => (
                    <SelectItem key={i.symbol} value={i.symbol}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TV_INTERVALS.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Starting balance ({defaultCurrency})</Label>
            <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!name.trim()) { toast.error("Give your session a name"); return; }
            onCreate(name.trim(), symbol, timeframe, +balance || 10000);
          }}>Create session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({
  open, onOpenChange, initial, onSave,
}: { open: boolean; onOpenChange: (o: boolean) => void; initial: string; onSave: (n: string) => void }) {
  const [v, setV] = useState(initial);
  useEffect(() => { if (open) setV(initial); }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Rename session</DialogTitle></DialogHeader>
        <Input value={v} onChange={(e) => setV(e.target.value)} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => v.trim() && onSave(v.trim())}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Reference silences unused import warnings for symbol constants
void TV_SYMBOLS;