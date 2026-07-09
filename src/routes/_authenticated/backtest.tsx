import { createFileRoute, Link } from "@tanstack/react-router";
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
import { TradingViewChart, TV_INTERVALS } from "@/components/app/tradingview-chart";
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
  ChevronDown, ChevronUp, BarChart3, Info,
  SkipBack, SkipForward, Play, Pause, FastForward, Rewind, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/backtest")({
  head: () => ({ meta: [
    { title: "Backtesting Lab — Traders Toolkit" },
    { name: "description", content: "Immersive TradingView workspace with MT5-style order execution, floating trade panel and session-tracked practice." },
  ] }),
  component: BacktestPage,
});

const FREE_SESSION_LIMIT = 2;

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

  useEffect(() => {
    if (!loading && !active) setPickerOpen(true);
  }, [loading, active]);

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
    if (!isPro && activeCount >= FREE_SESSION_LIMIT) { setUpgradeOpen(true); return; }
    const { data, error } = await supabase.from("backtest_sessions").insert({
      user_id: user.id, name, symbol, timeframe,
      starting_balance: startingBalance, ending_balance: startingBalance, status: "active",
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
    <div
      ref={shellRef}
      className={cn(
        "relative flex h-[calc(100vh-3.75rem)] w-full flex-col bg-[#0b0b12]",
        isFullscreen && "h-screen w-screen",
      )}
    >
      {active ? (
        <>
          <SessionStrip
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
            onSymbolChanged={async (sym) => {
              await supabase.from("backtest_sessions").update({ symbol: sym }).eq("id", active.id);
              setActive({ ...active, symbol: sym });
            }}
            onTimeframeChanged={async (tf) => {
              await supabase.from("backtest_sessions").update({ timeframe: tf }).eq("id", active.id);
              setActive({ ...active, timeframe: tf });
            }}
          />

          <div className="relative min-h-0 flex-1">
            <TradingViewChart
              symbol={toTV(active.symbol)}
              interval={active.timeframe}
              height="100%"
              className="absolute inset-0"
            />

            <FloatingTradeToolbar
              session={active}
              trades={trades}
              accountCurrency={accountCurrency}
              startingBalance={Number(active.starting_balance)}
              userId={user?.id ?? ""}
              onTradesChanged={() => loadTrades(active.id)}
            />

            <FloatingPositionsDock
              trades={trades}
              accountCurrency={accountCurrency}
              onChanged={() => loadTrades(active.id)}
            />

            <ReplayControlsBar />
          </div>
        </>
      ) : !loading ? (
        <div className="grid flex-1 place-items-center">
          <Card className="border-dashed">
            <CardContent className="p-10 text-center">
              <p className="text-muted-foreground">No session selected.</p>
              <Button className="mt-4" onClick={() => setPickerOpen(true)}>Select or create a session</Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {isFullscreen ? body : <AppShell title="Backtesting Lab" fullBleed>{body}</AppShell>}

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
// Session strip — slim bar with symbol/timeframe selectors and session menu
// ============================================================================
function SessionStrip({
  session, stats, accountCurrency, isFullscreen,
  onToggleFullscreen, onChangeSession, onRename, onDuplicate, onArchive, onDelete, onExport,
  onSymbolChanged, onTimeframeChanged,
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
  onSymbolChanged: (s: string) => void;
  onTimeframeChanged: (t: string) => void;
}) {
  const bal = stats?.endingBalance ?? Number(session.starting_balance);
  const net = stats?.net ?? 0;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-background/95 px-2 py-1.5 backdrop-blur">
      <p className="max-w-[180px] truncate text-xs font-semibold">{session.name}</p>

      <Select value={session.symbol} onValueChange={onSymbolChanged}>
        <SelectTrigger className="h-7 w-[150px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {INSTRUMENT_SPECS.map((i) => (
            <SelectItem key={i.symbol} value={i.symbol} className="text-xs">{i.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="hidden items-center gap-0.5 rounded border border-border/60 p-0.5 md:flex">
        {TV_INTERVALS.map((tf) => (
          <button
            key={tf.value}
            onClick={() => onTimeframeChanged(tf.value)}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium transition",
              session.timeframe === tf.value
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-muted/40",
            )}
          >{tf.label}</button>
        ))}
      </div>
      <Select value={session.timeframe} onValueChange={onTimeframeChanged}>
        <SelectTrigger className="h-7 w-[80px] text-xs md:hidden"><SelectValue /></SelectTrigger>
        <SelectContent>
          {TV_INTERVALS.map((t) => (<SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-3 text-[11px]">
        <span className="text-muted-foreground">Bal <span className="font-semibold text-foreground">{formatMoney(bal, accountCurrency)}</span></span>
        <span className={cn("font-semibold", net >= 0 ? "text-success" : "text-destructive")}>
          {net >= 0 ? "+" : ""}{formatMoney(net, accountCurrency)}
        </span>
        <span className="text-muted-foreground">{stats?.trades ?? 0} trades · WR {stats ? stats.winRate.toFixed(0) : 0}%</span>
      </div>

      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onChangeSession}>Change</Button>
      <Link to="/replay">
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" title="Backtesting Station">
          <BarChart3 className="h-3.5 w-3.5" /> Station
        </Button>
      </Link>
      <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={onToggleFullscreen} title="Fullscreen">
        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0"><MoreVertical className="h-3.5 w-3.5" /></Button>
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
  );
}

// ============================================================================
// Floating Trade Toolbar (MT5-style, bottom-right)
// ============================================================================
function FloatingTradeToolbar({
  session, trades, accountCurrency, startingBalance, userId, onTradesChanged,
}: {
  session: BacktestSession;
  trades: BacktestTrade[];
  accountCurrency: string;
  startingBalance: number;
  userId: string;
  onTradesChanged: () => void;
}) {
  const spec = getSpec(session.symbol);
  const stats = computeSessionStats(trades, startingBalance);
  const currentBalance = stats.endingBalance;

  const [collapsed, setCollapsed] = useState(false);
  const [markPrice, setMarkPrice] = useState<number>(spec.referencePrice);
  useEffect(() => { setMarkPrice(getSpec(session.symbol).referencePrice); }, [session.symbol]);

  const [orderType, setOrderType] = useState<"market" | "limit" | "stop">("market");
  const [lots, setLots] = useState<string>("0.10");
  const [riskPct, setRiskPct] = useState<string>("1");
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [sl, setSl] = useState<string>("");
  const [tp, setTp] = useState<string>("");
  const [sizingMode, setSizingMode] = useState<"lots" | "risk">("risk");

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

  function place(side: "long" | "short") {
    const lotsN = +lots;
    const slN = +sl || null;
    const tpN = +tp || null;
    const entryN = orderType === "market" ? markPrice : +entryPrice;

    if (!lotsN || lotsN < spec.minLot) return toast.error(`Lot size must be at least ${spec.minLot}`);
    if (!entryN) return toast.error("Entry price required");
    if (slN && ((side === "long" && slN >= entryN) || (side === "short" && slN <= entryN)))
      return toast.error("Stop loss on the wrong side of entry");
    if (tpN && ((side === "long" && tpN <= entryN) || (side === "short" && tpN >= entryN)))
      return toast.error("Take profit on the wrong side of entry");

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
      risk_amount: riskAmount, rr,
      opened_at: orderType === "market" ? now : null,
    }).then(({ error }) => {
      if (error) { toast.error(error.message); return; }
      toast.success(`${side === "long" ? "Buy" : "Sell"} ${orderType} placed`);
      setEntryPrice(""); setSl(""); setTp("");
      onTradesChanged();
    });
  }

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-20 w-[260px] rounded-lg border border-border/60 bg-background/95 shadow-2xl backdrop-blur">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between rounded-t-lg border-b border-border/60 bg-muted/30 px-3 py-1.5 text-xs font-semibold"
      >
        <span>Quick Trade · {session.symbol}</span>
        {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {!collapsed && (
        <div className="space-y-2 p-2.5">
          <div className="flex items-center gap-1.5">
            <Select value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit" | "stop")}>
              <SelectTrigger className="h-7 flex-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="market" className="text-xs">Market</SelectItem>
                <SelectItem value="limit" className="text-xs">Limit</SelectItem>
                <SelectItem value="stop" className="text-xs">Stop</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sizingMode} onValueChange={(v) => setSizingMode(v as "lots" | "risk")}>
              <SelectTrigger className="h-7 flex-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="risk" className="text-xs">Auto lot</SelectItem>
                <SelectItem value="lots" className="text-xs">Fixed lots</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <FieldMini label="Lots">
              <Input type="number" step="0.01" value={lots} onChange={(e) => setLots(e.target.value)}
                disabled={sizingMode === "risk"} className="h-7 text-xs" />
            </FieldMini>
            <FieldMini label="Risk %">
              <Input type="number" step="0.1" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} className="h-7 text-xs" />
            </FieldMini>
            {orderType !== "market" && (
              <FieldMini label="Entry">
                <Input type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className="h-7 text-xs" />
              </FieldMini>
            )}
            <FieldMini label="Mark">
              <Input type="number" step="any" value={markPrice} onChange={(e) => setMarkPrice(+e.target.value)} className="h-7 text-xs" />
            </FieldMini>
            <FieldMini label="SL">
              <Input type="number" step="any" value={sl} onChange={(e) => setSl(e.target.value)} className="h-7 text-xs" />
            </FieldMini>
            <FieldMini label="TP">
              <Input type="number" step="any" value={tp} onChange={(e) => setTp(e.target.value)} className="h-7 text-xs" />
            </FieldMini>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <Button
              onClick={() => place("long")}
              className="h-8 bg-success text-success-foreground hover:bg-success/90"
            >
              <TrendingUp className="mr-1 h-3.5 w-3.5" />
              {orderType === "market" ? "Buy" : `Buy ${orderType}`}
            </Button>
            <Button
              onClick={() => place("short")}
              className="h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <TrendingDown className="mr-1 h-3.5 w-3.5" />
              {orderType === "market" ? "Sell" : `Sell ${orderType}`}
            </Button>
          </div>

          <p className="pt-1 text-[10px] leading-tight text-muted-foreground">
            <Info className="mr-1 inline h-3 w-3" />
            Mark price seeds fills. Update it to match chart price for realistic sim.
          </p>
        </div>
      )}
    </div>
  );
}

function FieldMini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ============================================================================
// Floating Positions Dock (bottom-left)
// ============================================================================
function FloatingPositionsDock({
  trades, accountCurrency, onChanged,
}: {
  trades: BacktestTrade[];
  accountCurrency: string;
  onChanged: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const openTrades = trades.filter((t) => t.status === "open");
  const pending = trades.filter((t) => t.status === "pending");
  const history = trades.filter((t) => t.status === "closed" || t.status === "cancelled");

  return (
    <div className="pointer-events-auto absolute bottom-14 left-3 z-20 w-[340px] max-w-[calc(100vw-1.5rem)] rounded-lg border border-border/60 bg-background/95 shadow-2xl backdrop-blur">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between rounded-t-lg border-b border-border/60 bg-muted/30 px-3 py-1.5 text-xs font-semibold"
      >
        <span>Positions · {openTrades.length} open · {pending.length} pending</span>
        {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {!collapsed && (
        <div className="p-2">
          <Tabs defaultValue="open">
            <TabsList className="grid h-8 w-full grid-cols-3">
              <TabsTrigger value="open" className="text-xs">Open ({openTrades.length})</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">History ({history.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="open" className="mt-2 max-h-[240px] space-y-1.5 overflow-y-auto">
              {openTrades.length === 0 && <Empty label="No open positions" />}
              {openTrades.map((t) => (
                <OpenTradeRow key={t.id} trade={t} accountCurrency={accountCurrency} onChanged={onChanged} />
              ))}
            </TabsContent>
            <TabsContent value="pending" className="mt-2 max-h-[240px] space-y-1.5 overflow-y-auto">
              {pending.length === 0 && <Empty label="No pending orders" />}
              {pending.map((t) => (
                <PendingRow key={t.id} trade={t} onChanged={onChanged} />
              ))}
            </TabsContent>
            <TabsContent value="history" className="mt-2 max-h-[240px] space-y-1.5 overflow-y-auto">
              {history.length === 0 && <Empty label="No closed trades yet" />}
              {history.map((t) => (
                <HistoryRow key={t.id} trade={t} accountCurrency={accountCurrency} />
              ))}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return <p className="py-6 text-center text-[11px] text-muted-foreground">{label}</p>;
}

function OpenTradeRow({
  trade, accountCurrency, onChanged,
}: { trade: BacktestTrade; accountCurrency: string; onChanged: () => void }) {
  const spec = getSpec(trade.symbol);
  const [sl, setSl] = useState(trade.sl?.toString() ?? "");
  const [tp, setTp] = useState(trade.tp?.toString() ?? "");
  const [exitPrice, setExitPrice] = useState<string>(trade.entry?.toString() ?? "");
  const [showModify, setShowModify] = useState(false);

  const exit = +exitPrice || trade.entry || 0;
  const pnl = trade.entry ? computePnl(spec, trade.direction, trade.entry, exit, trade.lots, accountCurrency) : 0;

  async function saveSlTp() {
    await supabase.from("backtest_trades").update({ sl: +sl || null, tp: +tp || null }).eq("id", trade.id);
    toast.success("SL/TP updated"); onChanged();
  }
  async function closeAt(px: number, reason: string, lotsClosed?: number) {
    const lots = lotsClosed ?? trade.lots;
    const pnlClose = trade.entry ? computePnl(spec, trade.direction, trade.entry, px, lots, accountCurrency) : 0;
    const closed_at = new Date().toISOString();
    const duration = trade.opened_at
      ? Math.max(0, Math.round((Date.parse(closed_at) - Date.parse(trade.opened_at)) / 1000)) : null;
    if (lotsClosed && lotsClosed < trade.lots) {
      const remaining = +(trade.lots - lotsClosed).toFixed(2);
      await supabase.from("backtest_trades").insert({
        session_id: trade.session_id, user_id: trade.user_id,
        symbol: trade.symbol, direction: trade.direction, order_type: "market",
        status: "closed", entry: trade.entry, sl: trade.sl, tp: trade.tp,
        exit: px, exit_reason: reason, lots: lotsClosed, risk_pct: trade.risk_pct,
        risk_amount: trade.risk_amount, rr: trade.rr, pnl: pnlClose,
        opened_at: trade.opened_at, closed_at, duration_sec: duration,
      });
      await supabase.from("backtest_trades").update({ lots: remaining }).eq("id", trade.id);
      toast.success(`Closed ${lotsClosed} lots`);
    } else {
      await supabase.from("backtest_trades").update({
        status: "closed", exit: px, exit_reason: reason, pnl: pnlClose,
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
    toast.success("Stop moved to BE"); onChanged();
  }

  return (
    <div className="rounded border border-border/60 bg-card/50 p-1.5 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">
          {trade.direction === "long"
            ? <TrendingUp className="mr-1 inline h-3 w-3 text-success" />
            : <TrendingDown className="mr-1 inline h-3 w-3 text-destructive" />}
          {trade.symbol} · {trade.lots}
        </span>
        <span className={cn("font-semibold", pnl >= 0 ? "text-success" : "text-destructive")}>
          {formatMoney(pnl, accountCurrency)}
        </span>
      </div>
      <p className="mt-0.5 text-muted-foreground">
        Entry {trade.entry?.toFixed(spec.digits)} · SL {trade.sl?.toFixed(spec.digits) ?? "—"} · TP {trade.tp?.toFixed(spec.digits) ?? "—"}
      </p>
      <div className="mt-1 flex items-center gap-1">
        <Input type="number" step="any" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)}
          placeholder="Exit price" className="h-6 flex-1 text-[11px]" />
        <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => closeAt(exit, "manual")}>Close</Button>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
          onClick={() => closeAt(exit, "manual", +(trade.lots / 2).toFixed(2))}
          disabled={trade.lots < 0.02}>50%</Button>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={moveToBE}>BE</Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowModify((s) => !s)}>
          <PencilLine className="h-3 w-3" />
        </Button>
      </div>
      {showModify && (
        <div className="mt-1 flex items-center gap-1">
          <Input type="number" step="any" value={sl} onChange={(e) => setSl(e.target.value)} placeholder="SL" className="h-6 text-[11px]" />
          <Input type="number" step="any" value={tp} onChange={(e) => setTp(e.target.value)} placeholder="TP" className="h-6 text-[11px]" />
          <Button size="sm" className="h-6 px-2 text-[10px]" onClick={saveSlTp}>Save</Button>
        </div>
      )}
    </div>
  );
}

function PendingRow({ trade, onChanged }: { trade: BacktestTrade; onChanged: () => void }) {
  const spec = getSpec(trade.symbol);
  async function fill() {
    await supabase.from("backtest_trades").update({
      status: "open", opened_at: new Date().toISOString(), entry: trade.entry,
    }).eq("id", trade.id);
    toast.success("Order filled"); onChanged();
  }
  async function cancel() {
    await supabase.from("backtest_trades").update({
      status: "cancelled", exit_reason: "cancelled",
    }).eq("id", trade.id);
    toast.success("Order cancelled"); onChanged();
  }
  return (
    <div className="rounded border border-border/60 bg-card/50 p-1.5 text-[11px]">
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {trade.direction === "long" ? "▲" : "▼"} {trade.symbol} · {trade.order_type} · {trade.lots}
        </span>
      </div>
      <p className="mt-0.5 text-muted-foreground">
        Entry {trade.entry?.toFixed(spec.digits)} · SL {trade.sl?.toFixed(spec.digits) ?? "—"} · TP {trade.tp?.toFixed(spec.digits) ?? "—"}
      </p>
      <div className="mt-1 flex gap-1">
        <Button size="sm" className="h-6 px-2 text-[10px]" onClick={fill}>Fill now</Button>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-destructive" onClick={cancel}>
          <X className="mr-1 h-3 w-3" /> Cancel
        </Button>
      </div>
    </div>
  );
}

function HistoryRow({ trade, accountCurrency }: { trade: BacktestTrade; accountCurrency: string }) {
  const spec = getSpec(trade.symbol);
  return (
    <div className="rounded border border-border/60 bg-card/50 p-1.5 text-[11px]">
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {trade.direction === "long" ? "▲" : "▼"} {trade.symbol} · {trade.lots}
        </span>
        <span className={cn("font-semibold", (trade.pnl ?? 0) >= 0 ? "text-success" : "text-destructive")}>
          {formatMoney(trade.pnl ?? 0, accountCurrency)}
        </span>
      </div>
      <p className="mt-0.5 text-muted-foreground">
        {trade.entry?.toFixed(spec.digits)} → {trade.exit?.toFixed(spec.digits) ?? "—"} · {trade.exit_reason ?? "manual"}
        {trade.rr != null && ` · ${trade.rr.toFixed(2)}R`}
      </p>
    </div>
  );
}

// ============================================================================
// Replay Controls Bar (bottom media-player strip)
//
// The free TradingView widget is an iframe we don't control, so we cannot
// programmatically step candles. This bar surfaces the controls users expect
// and, on click, points them to TV's built-in Bar Replay tool in the chart's
// left toolbar. If we later license the TradingView Charting Library we can
// wire these buttons to real chart actions.
// ============================================================================
function ReplayControlsBar() {
  const [dismissed, setDismissed] = useState(false);
  const [showHint, setShowHint] = useState(false);

  function nudge() {
    setShowHint(true);
    setTimeout(() => setShowHint(false), 3200);
    toast("Bar Replay lives inside the chart", {
      description: "Click the ⏵ Replay button on the chart's top toolbar to step bars, pause, and change speed.",
    });
  }

  if (dismissed) return null;

  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border/60 bg-background/95 px-2 py-1 shadow-xl backdrop-blur">
      <div className="flex items-center gap-1">
        <span className="hidden px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:inline">Replay</span>
        <ReplayBtn icon={<SkipBack className="h-3.5 w-3.5" />} label="Jump back" onClick={nudge} />
        <ReplayBtn icon={<Rewind className="h-3.5 w-3.5" />} label="Step -1" onClick={nudge} />
        <ReplayBtn icon={<Play className="h-3.5 w-3.5" />} label="Play" onClick={nudge} />
        <ReplayBtn icon={<Pause className="h-3.5 w-3.5" />} label="Pause" onClick={nudge} />
        <ReplayBtn icon={<FastForward className="h-3.5 w-3.5" />} label="Step +1" onClick={nudge} />
        <ReplayBtn icon={<SkipForward className="h-3.5 w-3.5" />} label="Jump forward" onClick={nudge} />
        <Select defaultValue="1" onValueChange={nudge}>
          <SelectTrigger className="h-7 w-[64px] text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["0.5","1","2","5","10","20"].map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{s}×</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ReplayBtn icon={<CalendarDays className="h-3.5 w-3.5" />} label="Jump to date" onClick={nudge} />
        <button
          onClick={() => setDismissed(true)}
          className="ml-1 rounded p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          aria-label="Hide replay bar"
          title="Hide"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {showHint && (
        <p className="mt-1 max-w-[420px] px-2 pb-1 text-center text-[10px] leading-tight text-muted-foreground">
          <Info className="mr-1 inline h-3 w-3" />
          Use TradingView's built-in Bar Replay on the chart toolbar (top of chart). External replay control needs the paid Charting Library.
        </p>
      )}
    </div>
  );
}
function ReplayBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
    >{icon}</button>
  );
}

// ============================================================================
// Session Picker + Create + Rename dialogs
// ============================================================================
function SessionPickerDialog({
  open, onOpenChange, sessions, loading, onResume, onCreate, isPro, limit, onUpgrade,
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