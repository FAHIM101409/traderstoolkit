import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { UpgradeDialog } from "@/components/app/upgrade-dialog";
import { formatMoney } from "@/lib/currencies";
import { INSTRUMENT_SPECS, getSpec } from "@/lib/instruments";
import { computeSessionStats, type BacktestSession, type BacktestTrade } from "@/lib/backtest";
import { fetchCandles } from "@/lib/marketdata.functions";
import { REPLAY_TIMEFRAMES, type Candle } from "@/lib/marketdata";
import { processBar, closeAt, type SimContext } from "@/lib/replay-sim";
import { ReplayChart } from "@/components/backtest/replay-chart";
import { DrawingToolbar } from "@/components/backtest/drawing-toolbar";
import { IndicatorManager } from "@/components/backtest/indicator-manager";
import { ChartSettingsDialog } from "@/components/backtest/chart-settings-dialog";
import { OrderTicket, type NewOrder } from "@/components/backtest/order-ticket";
import { PositionsDock } from "@/components/backtest/positions-dock";
import { ReplayControls } from "@/components/backtest/replay-controls";
import { DEFAULT_CHART_SETTINGS, type ChartSettings, type Drawing, type DrawingTool } from "@/components/backtest/chart-types";
import type { IndicatorConfig } from "@/lib/indicators";
import { toast } from "sonner";
import {
  Maximize2, Minimize2, Settings2, LineChart as LineChartIcon, Plus, Loader2,
  Archive, Trash2, Columns2, Grid2X2, Square as SquareIcon, BarChart3, Lock, Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/backtest")({
  head: () => ({
    meta: [
      { title: "Backtesting Lab — Bar Replay Workspace | Traders Toolkit" },
      { name: "description", content: "Blind bar-by-bar replay on real historical candles with MT5-style order execution, draggable stops, drawings and indicators." },
      { property: "og:title", content: "Backtesting Lab — Bar Replay Workspace" },
      { property: "og:description", content: "Practise real setups bar by bar with hidden future candles, full order execution and session-tracked results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BacktestPage,
});

const FREE_SESSION_LIMIT = 2;

type PaneCfg = { symbol: string; timeframe: string };

type ChartState = {
  settings: ChartSettings;
  indicators: IndicatorConfig[];
  drawings: Drawing[];
  favorites: DrawingTool[];
  panes: PaneCfg[];
  layout: "1" | "2" | "4";
};

const DEFAULT_CHART_STATE: ChartState = {
  settings: DEFAULT_CHART_SETTINGS,
  indicators: [],
  drawings: [],
  favorites: ["trend", "hline"],
  panes: [],
  layout: "1",
};

function BacktestPage() {
  const { user } = useAuth();
  const { profile, isPro } = useProfile();
  const accountCurrency = profile?.account_currency ?? "USD";
  const callCandles = useServerFn(fetchCandles);

  // ------------------------------------------------------------- sessions
  const [sessions, setSessions] = useState<BacktestSession[]>([]);
  const [active, setActive] = useState<BacktestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // ------------------------------------------------------------- workspace
  const [symbol, setSymbol] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("1H");
  const [chartState, setChartState] = useState<ChartState>(DEFAULT_CHART_STATE);
  const [tool, setTool] = useState<DrawingTool>("cursor");
  const [drawColor, setDrawColor] = useState("#38bdf8");
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  // --------------------------------------------------------------- market
  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [startOpen, setStartOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [hoveredBar, setHoveredBar] = useState<Candle | null>(null);

  // ---------------------------------------------------------------- trades
  const [trades, setTrades] = useState<BacktestTrade[]>([]);
  const dirty = useRef<Map<string, BacktestTrade>>(new Map());

  const spec = useMemo(() => getSpec(symbol), [symbol]);
  const visible = useMemo(() => allCandles.slice(0, cursor + 1), [allCandles, cursor]);
  const currentBar = visible[visible.length - 1];
  const displayBar = hoveredBar ?? currentBar;
  const price = currentBar?.close ?? 0;

  const simCtx: SimContext = useMemo(() => ({
    spec,
    accountCurrency,
    commissionPerLot: Number((active as any)?.commission_per_lot ?? 0),
    spreadPoints: Number((active as any)?.spread_points ?? 0),
  }), [spec, accountCurrency, active]);

  const stats = useMemo(
    () => computeSessionStats(trades, Number(active?.starting_balance ?? 10000)),
    [trades, active],
  );
  const balance = stats.endingBalance;

  // ------------------------------------------------------------ load data
  const loadSessions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("backtest_sessions").select("*").eq("user_id", user.id)
      .order("last_opened_at", { ascending: false });
    setSessions((data as unknown as BacktestSession[]) ?? []);
    setLoading(false);
  }, [user]);
  useEffect(() => { void loadSessions(); }, [loadSessions]);
  useEffect(() => { if (!loading && !active) setPickerOpen(true); }, [loading, active]);

  const openSession = useCallback(async (s: BacktestSession) => {
    setActive(s);
    setPickerOpen(false);
    setSymbol(s.symbol);
    setTimeframe(s.timeframe);
    const cs = ((s as any).chart_state ?? {}) as Partial<ChartState>;
    setChartState({
      ...DEFAULT_CHART_STATE,
      ...cs,
      settings: { ...DEFAULT_CHART_SETTINGS, ...(cs.settings ?? {}) },
      indicators: cs.indicators ?? [],
      drawings: cs.drawings ?? [],
      favorites: cs.favorites ?? DEFAULT_CHART_STATE.favorites,
      panes: cs.panes ?? [],
      layout: cs.layout ?? "1",
    });
    const { data } = await supabase.from("backtest_trades").select("*").eq("session_id", s.id).order("created_at");
    setTrades((data as unknown as BacktestTrade[]) ?? []);
    void supabase.from("backtest_sessions").update({ last_opened_at: new Date().toISOString() }).eq("id", s.id);
  }, []);

  // Fetch candles whenever the instrument or timeframe changes
  useEffect(() => {
    let cancelled = false;
    if (!active) return;
    setDataLoading(true);
    setDataError(null);
    setPlaying(false);
    callCandles({ data: { symbol, interval: timeframe, outputsize: 5000 } })
      .then((res) => {
        if (cancelled) return;
        if (res.error) { setDataError(res.error); setAllCandles([]); return; }
        if (!res.candles.length) { setDataError("No candles returned for this instrument."); setAllCandles([]); return; }
        setAllCandles(res.candles);
        const saved = ((active as any).replay_state ?? {}) as { cursorTime?: number; symbol?: string; timeframe?: string; speed?: number };
        if (saved.speed) setSpeed(saved.speed);
        if (saved.cursorTime && saved.symbol === symbol && saved.timeframe === timeframe) {
          const idx = res.candles.findIndex((c) => c.time >= (saved.cursorTime as number));
          setCursor(idx >= 0 ? idx : Math.floor(res.candles.length / 2));
        } else {
          setCursor(Math.max(150, Math.floor(res.candles.length * 0.6)));
        }
      })
      .catch(() => !cancelled && setDataError("Could not load historical data."))
      .finally(() => !cancelled && setDataLoading(false));
    return () => { cancelled = true; };
  }, [symbol, timeframe, active?.id, callCandles]);

  // ------------------------------------------------------------- persistence
  const queueTrade = useCallback((t: BacktestTrade) => { dirty.current.set(t.id, t); }, []);

  useEffect(() => {
    const id = window.setInterval(async () => {
      if (!dirty.current.size) return;
      const batch = Array.from(dirty.current.values());
      dirty.current.clear();
      for (const t of batch) {
        const { id: _id, ...rest } = t;
        await supabase.from("backtest_trades").update(rest as any).eq("id", t.id);
      }
    }, 1500);
    return () => window.clearInterval(id);
  }, []);

  // Save replay + chart state (debounced)
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => {
      void supabase.from("backtest_sessions").update({
        symbol, timeframe,
        chart_state: chartState as any,
        replay_state: { cursorTime: allCandles[cursor]?.time ?? null, symbol, timeframe, speed } as any,
        ending_balance: balance,
        stats: stats as any,
      } as any).eq("id", active.id);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [chartState, cursor, symbol, timeframe, speed, active, allCandles, balance, stats]);

  // ------------------------------------------------------------ replay step
  const cursorRef = useRef(0);
  const tradesRef = useRef<BacktestTrade[]>([]);
  useEffect(() => { cursorRef.current = cursor; }, [cursor]);
  useEffect(() => { tradesRef.current = trades; }, [trades]);

  const stepForward = useCallback((delta = 1) => {
    if (!allCandles.length) return;
    const prev = cursorRef.current;
    const next = Math.min(prev + delta, allCandles.length - 1);
    if (next <= prev) return;
    let list = tradesRef.current;
    for (let i = prev + 1; i <= next; i++) {
      const bar = allCandles[i];
      if (!bar) continue;
      const res = processBar(list, bar, simCtx);
      if (res.events.length) {
        res.events.forEach((e) => toast(e.message));
        res.trades.forEach((t) => {
          const before = list.find((x) => x.id === t.id);
          if (before && before.status !== t.status) queueTrade(t);
        });
      }
      list = res.trades;
    }
    tradesRef.current = list;
    cursorRef.current = next;
    setTrades(list);
    setCursor(next);
  }, [allCandles, simCtx, queueTrade]);

  useEffect(() => {
    if (!playing) return;
    const ms = Math.max(60, 800 / speed);
    const id = window.setInterval(() => {
      if (cursorRef.current >= allCandles.length - 1) { setPlaying(false); return; }
      stepForward(1);
    }, ms);
    return () => window.clearInterval(id);
  }, [playing, speed, stepForward, allCandles.length]);


  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === "ArrowRight") { e.preventDefault(); stepForward(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
      if (e.key.toLowerCase() === "escape") setTool("cursor");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepForward]);

  // --------------------------------------------------------------- orders
  async function submitOrder(o: NewOrder) {
    if (!user || !active || !currentBar) return;
    const nowIso = new Date(currentBar.time * 1000).toISOString();
    const isMarket = o.order_type === "market";
    const row = {
      session_id: active.id,
      user_id: user.id,
      symbol,
      direction: o.direction,
      order_type: o.order_type,
      status: isMarket ? "open" : "pending",
      entry: o.entry,
      sl: o.sl,
      tp: o.tp,
      lots: o.lots,
      risk_pct: o.risk_pct,
      risk_amount: o.risk_amount,
      rr: o.sl && o.tp && o.entry ? Math.abs(o.tp - o.entry) / Math.abs(o.entry - o.sl) : null,
      opened_at: isMarket ? nowIso : null,
    };
    const { data, error } = await supabase.from("backtest_trades").insert(row as any).select().single();
    if (error) { toast.error(error.message); return; }
    setTrades((t) => [...t, data as unknown as BacktestTrade]);
    toast.success(`${o.direction === "long" ? "Buy" : "Sell"} ${o.lots} ${symbol} ${isMarket ? "executed" : "placed"}`);
  }

  function patchTrade(id: string, patch: Partial<BacktestTrade>) {
    setTrades((cur) => cur.map((t) => {
      if (t.id !== id) return t;
      const next = { ...t, ...patch };
      queueTrade(next);
      return next;
    }));
  }

  function manualClose(t: BacktestTrade) {
    if (!currentBar) return;
    const closed = closeAt(t, price, simCtx, new Date(currentBar.time * 1000).toISOString());
    patchTrade(t.id, closed);
    toast(`Closed ${(closed.pnl ?? 0) >= 0 ? "+" : ""}${(closed.pnl ?? 0).toFixed(2)}`);
  }

  function cancelPending(t: BacktestTrade) {
    patchTrade(t.id, { status: "cancelled", closed_at: new Date().toISOString() });
  }

  function toBreakEven(t: BacktestTrade) {
    if (t.entry == null) return;
    patchTrade(t.id, { sl: t.entry });
    toast("Stop moved to break-even");
  }

  function nudge(t: BacktestTrade, key: "sl" | "tp", pips: number) {
    const base = (t as any)[key] ?? t.entry;
    if (base == null) return;
    patchTrade(t.id, { [key]: base + pips * spec.pipSize } as Partial<BacktestTrade>);
  }

  // ------------------------------------------------------------ session ops
  async function createSession(name: string, sym: string, tf: string, startingBalance: number) {
    if (!user) return;
    if (!isPro && sessions.filter((s) => s.status === "active").length >= FREE_SESSION_LIMIT) {
      setUpgradeOpen(true); return;
    }
    const { data, error } = await supabase.from("backtest_sessions").insert({
      user_id: user.id, name, symbol: sym, timeframe: tf,
      starting_balance: startingBalance, ending_balance: startingBalance, status: "active",
    } as any).select().single();
    if (error) { toast.error(error.message); return; }
    await loadSessions();
    await openSession(data as unknown as BacktestSession);
    setStartOpen(true);
  }

  async function archiveSession(s: BacktestSession) {
    await supabase.from("backtest_sessions").update({ status: s.status === "archived" ? "active" : "archived" }).eq("id", s.id);
    await loadSessions();
  }
  async function deleteSession(s: BacktestSession) {
    await supabase.from("backtest_trades").delete().eq("session_id", s.id);
    await supabase.from("backtest_sessions").delete().eq("id", s.id);
    if (active?.id === s.id) { setActive(null); setTrades([]); }
    await loadSessions();
  }

  // ----------------------------------------------------------- fullscreen
  async function toggleFullscreen() {
    const el = shellRef.current;
    if (!el) return;
    if (!document.fullscreenElement) { await el.requestFullscreen?.(); setFullscreen(true); }
    else { await document.exitFullscreen?.(); setFullscreen(false); }
  }
  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // ------------------------------------------------------------ jump-to-date
  function jumpToDate() {
    const ts = Date.parse(startDate);
    if (!Number.isFinite(ts)) { toast.error("Pick a valid date"); return; }
    const target = Math.floor(ts / 1000);
    let idx = allCandles.findIndex((c) => c.time >= target);
    if (idx < 0) idx = allCandles.length - 1;
    setCursor(Math.max(1, idx));
    setStartOpen(false);
    setPlaying(false);
    toast.success(`Replay start set to ${new Date(allCandles[idx]?.time * 1000).toUTCString()}`);
  }

  const patchChart = (p: Partial<ChartState>) => setChartState((c) => ({ ...c, ...p }));
  const openPositions = trades.filter((t) => t.status === "open" || t.status === "pending");
  const closedTrades = trades.filter((t) => t.status === "closed");
  const barLabel = currentBar ? new Date(currentBar.time * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "—";

  const paneCount = chartState.layout === "4" ? 4 : chartState.layout === "2" ? 2 : 1;
  const extraPanes = Array.from({ length: paneCount - 1 }, (_, i) => chartState.panes[i] ?? { symbol, timeframe: timeframe === "1H" ? "15m" : "1H" });
  const cutoff = currentBar?.time ?? 0;

  return (
    <AppShell title="Backtesting Lab" fullBleed>
      <TooltipProvider delayDuration={200}>
        <div ref={shellRef} className="flex h-[calc(100dvh-57px)] min-h-[520px] flex-col bg-background">
          {/* ------------------------------------------------- top strip */}
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 bg-card/80 px-2 py-1.5 backdrop-blur">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs font-semibold" onClick={() => setPickerOpen(true)}>
              <LineChartIcon className="h-3.5 w-3.5 text-primary" />
              {active?.name ?? "Choose session"}
            </Button>

            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {["Forex Major", "Forex Minor", "Forex Cross", "Forex Exotic", "Metals", "Indices", "Crypto", "Commodities"].map((g) => {
                  const items = INSTRUMENT_SPECS.filter((s) => s.group === g);
                  if (!items.length) return null;
                  return (
                    <SelectGroup key={g}>
                      <SelectLabel className="text-[10px] uppercase">{g}</SelectLabel>
                      {items.map((s) => <SelectItem key={s.symbol} value={s.symbol}>{s.label}</SelectItem>)}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>

            <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-border/60 p-0.5">
              {REPLAY_TIMEFRAMES.map((t) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  key={t.value}
                  onClick={() => setTimeframe(t.value)}
                  className={cn(
                    "h-6 min-w-7 px-1.5 text-[11px]",
                    timeframe === t.value && "bg-primary/15 font-semibold text-primary",
                  )}
                  aria-label={`${t.label} timeframe`}
                >
                  {t.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-0.5 rounded-md border border-border/60 p-0.5">
              {([["1", SquareIcon], ["2", Columns2], ["4", Grid2X2]] as const).map(([k, Icon]) => (
                <Tooltip key={k}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => (k !== "1" && !isPro ? setUpgradeOpen(true) : patchChart({ layout: k }))}
                      className={cn("h-7 w-7",
                        chartState.layout === k && "bg-primary/15 text-primary")}
                      aria-label={`${k} chart layout`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{k === "1" ? "Single chart" : `${k} charts`}{k !== "1" && !isPro ? " (Pro)" : ""}</TooltipContent>
                </Tooltip>
              ))}
            </div>

            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => setIndicatorsOpen(true)}>
              <BarChart3 className="h-3.5 w-3.5" /> Indicators
              {chartState.indicators.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{chartState.indicators.length}</Badge>}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="h-3.5 w-3.5" /> Chart
            </Button>

            <div className="ml-auto flex shrink-0 items-center gap-3 text-xs">
              <span className="hidden items-center gap-1 font-mono text-[10px] text-muted-foreground xl:flex">
                {displayBar ? (
                  <>O <b className="text-foreground">{displayBar.open.toFixed(spec.digits)}</b> H <b className="text-success">{displayBar.high.toFixed(spec.digits)}</b> L <b className="text-destructive">{displayBar.low.toFixed(spec.digits)}</b> C <b className="text-foreground">{displayBar.close.toFixed(spec.digits)}</b></>
                ) : "No candle selected"}
              </span>
              <span className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:flex">
                <Radio className={cn("h-3 w-3", playing && "animate-pulse text-success")} />
                {playing ? "Replaying" : "Paused"}
              </span>
              <span className="text-muted-foreground">Balance</span>
              <span className="font-semibold">{formatMoney(balance, accountCurrency)}</span>
              <Link to="/replay" className="text-primary hover:underline">Analytics →</Link>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* ------------------------------------------------- chart area */}
          <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
            <DrawingToolbar
              active={tool}
              onSelect={setTool}
              favorites={chartState.favorites}
              onToggleFavorite={(t) =>
                patchChart({
                  favorites: chartState.favorites.includes(t)
                    ? chartState.favorites.filter((f) => f !== t)
                    : [...chartState.favorites, t],
                })
              }
              color={drawColor}
              onColor={setDrawColor}
              onClearAll={() => patchChart({ drawings: [] })}
              drawingCount={chartState.drawings.length}
            />

            <div className={cn("relative grid min-h-0 flex-1", paneCount === 1 ? "grid-cols-1" : paneCount === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2")}>
              <div className="relative min-h-0 border-r border-border/40">
                {dataLoading && (
                  <div className="absolute inset-0 z-30 grid place-items-center bg-background/70">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading {symbol} {timeframe} history…
                    </span>
                  </div>
                )}
                {dataError && (
                  <div className="absolute inset-0 z-30 grid place-items-center p-6">
                    <Card className="max-w-md border-destructive/40">
                      <CardContent className="space-y-2 p-5 text-center">
                        <p className="text-sm font-semibold">Historical data unavailable</p>
                        <p className="text-xs text-muted-foreground">{dataError}</p>
                        <p className="text-xs text-muted-foreground">Try another instrument or timeframe — some symbols are not covered by the data plan.</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
                <ReplayChart
                  candles={visible}
                  settings={chartState.settings}
                  indicators={chartState.indicators}
                  positions={openPositions}
                  closedTrades={closedTrades}
                  digits={spec.digits}
                  symbol={symbol}
                  timeframe={timeframe}
                  activeTool={tool}
                  drawings={chartState.drawings}
                  drawColor={drawColor}
                  onDrawingsChange={(d) => patchChart({ drawings: d })}
                  onToolDone={() => setTool("cursor")}
                  onCrosshair={({ candle }) => setHoveredBar(candle)}
                  onLevelDrag={(id, key, p) => patchTrade(id, { [key]: p } as Partial<BacktestTrade>)}
                />
              </div>

              {extraPanes.map((p, i) => (
                <SecondaryPane
                  key={i}
                  cfg={p}
                  cutoff={cutoff}
                  settings={chartState.settings}
                  onChange={(cfg) => {
                    const next = [...chartState.panes];
                    next[i] = cfg;
                    patchChart({ panes: next });
                  }}
                />
              ))}
            </div>

            {/* floating panels */}
            <div className="pointer-events-none absolute inset-0 hidden sm:block">
              <div className="pointer-events-auto absolute right-3 top-3">
                <OrderTicket
                  spec={spec}
                  accountCurrency={accountCurrency}
                  balance={balance}
                  price={price}
                  defaultRiskPct={Number(profile?.default_risk_pct ?? 1)}
                  disabled={!active || !currentBar}
                  onSubmit={submitOrder}
                />
              </div>
              <div className="pointer-events-auto absolute bottom-3 left-3">
                <PositionsDock
                  trades={trades}
                  spec={spec}
                  accountCurrency={accountCurrency}
                  price={price}
                  commissionPerLot={simCtx.commissionPerLot}
                  spreadPoints={simCtx.spreadPoints}
                  onClose={manualClose}
                  onCancel={cancelPending}
                  onBreakEven={toBreakEven}
                  onNudge={nudge}
                />
              </div>
            </div>
          </div>

          {/* ------------------------------------------------- replay bar */}
          <ReplayControls
            playing={playing}
            onPlayPause={() => setPlaying((p) => !p)}
            onStep={(d) => (d > 0 ? stepForward(1) : setCursor((c) => Math.max(0, c - 1)))}
            onJumpStart={() => { setPlaying(false); setCursor(Math.min(150, allCandles.length - 1)); }}
            onJumpEnd={() => { setPlaying(false); stepForward(allCandles.length - 1 - cursor); }}
            onReset={() => { setPlaying(false); setCursor(Math.min(150, allCandles.length - 1)); }}
            onPickDate={() => setStartOpen(true)}
            index={cursor}
            total={allCandles.length}
            speed={speed}
            onSpeed={setSpeed}
            onScrub={(i) => { setPlaying(false); i > cursor ? stepForward(i - cursor) : setCursor(i); }}
            barTime={barLabel}
            disabled={!allCandles.length}
          />
        </div>
      </TooltipProvider>

      {/* ----------------------------------------------------- dialogs */}
      <SessionPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        sessions={sessions}
        activeId={active?.id ?? null}
        isPro={isPro}
        onOpenSession={openSession}
        onCreate={createSession}
        onArchive={archiveSession}
        onDelete={deleteSession}
        currency={accountCurrency}
      />

      <IndicatorManager
        open={indicatorsOpen}
        onOpenChange={setIndicatorsOpen}
        indicators={chartState.indicators}
        onChange={(i) => patchChart({ indicators: i })}
      />

      <ChartSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={chartState.settings}
        onChange={(s) => patchChart({ settings: s })}
      />

      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Replay start point</DialogTitle>
            <DialogDescription>
              Pick the date and time where replay begins. Every candle after it stays hidden until you step forward.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Start date & time (UTC)</Label>
            <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            {allCandles.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Data available {new Date(allCandles[0].time * 1000).toISOString().slice(0, 16).replace("T", " ")} →{" "}
                {new Date(allCandles[allCandles.length - 1].time * 1000).toISOString().slice(0, 16).replace("T", " ")} UTC
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStartOpen(false)}>Cancel</Button>
            <Button onClick={jumpToDate}>Set start point</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */

function SecondaryPane({
  cfg, cutoff, settings, onChange,
}: {
  cfg: PaneCfg;
  cutoff: number;
  settings: ChartSettings;
  onChange: (c: PaneCfg) => void;
}) {
  const callCandles = useServerFn(fetchCandles);
  const [candles, setCandles] = useState<Candle[]>([]);
  const spec = getSpec(cfg.symbol);

  useEffect(() => {
    let cancelled = false;
    callCandles({ data: { symbol: cfg.symbol, interval: cfg.timeframe, outputsize: 5000 } })
      .then((r) => !cancelled && setCandles(r.candles ?? []))
      .catch(() => !cancelled && setCandles([]));
    return () => { cancelled = true; };
  }, [cfg.symbol, cfg.timeframe, callCandles]);

  const visible = useMemo(
    () => (cutoff ? candles.filter((c) => c.time <= cutoff) : candles),
    [candles, cutoff],
  );

  return (
    <div className="relative min-h-0 border-l border-t border-border/40">
      <div className="absolute left-2 top-2 z-20 flex gap-1">
        <Select value={cfg.symbol} onValueChange={(v) => onChange({ ...cfg, symbol: v })}>
          <SelectTrigger className="h-6 w-[120px] bg-card/80 text-[10px]"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-64">
            {INSTRUMENT_SPECS.map((s) => <SelectItem key={s.symbol} value={s.symbol}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cfg.timeframe} onValueChange={(v) => onChange({ ...cfg, timeframe: v })}>
          <SelectTrigger className="h-6 w-[70px] bg-card/80 text-[10px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {REPLAY_TIMEFRAMES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <ReplayChart
        candles={visible}
        settings={{ ...settings, showWatermark: false }}
        digits={spec.digits}
        symbol={cfg.symbol}
        timeframe={cfg.timeframe}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SessionPicker({
  open, onOpenChange, sessions, activeId, isPro, onOpenSession, onCreate, onArchive, onDelete, currency,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessions: BacktestSession[];
  activeId: string | null;
  isPro: boolean;
  onOpenSession: (s: BacktestSession) => void;
  onCreate: (name: string, symbol: string, tf: string, balance: number) => void;
  onArchive: (s: BacktestSession) => void;
  onDelete: (s: BacktestSession) => void;
  currency: string;
}) {
  const [name, setName] = useState("");
  const [sym, setSym] = useState("EURUSD");
  const [tf, setTf] = useState("1H");
  const [bal, setBal] = useState("10000");

  const activeCount = sessions.filter((s) => s.status === "active").length;
  const limited = !isPro && activeCount >= FREE_SESSION_LIMIT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Backtesting sessions</DialogTitle>
          <DialogDescription>Each session keeps its own balance, trade history, chart layout and replay position.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New session</p>
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="London breakout run" className="h-8" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Instrument</Label>
                <Select value={sym} onValueChange={setSym}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {INSTRUMENT_SPECS.map((s) => <SelectItem key={s.symbol} value={s.symbol}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Timeframe</Label>
                <Select value={tf} onValueChange={setTf}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPLAY_TIMEFRAMES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Starting balance</Label>
              <Input value={bal} onChange={(e) => setBal(e.target.value)} inputMode="decimal" className="h-8" />
            </div>
            {limited ? (
              <p className="flex items-center gap-1 text-[11px] text-amber-500">
                <Lock className="h-3 w-3" /> Free plan is limited to {FREE_SESSION_LIMIT} active sessions.
              </p>
            ) : null}
            <Button
              className="w-full gap-1"
              onClick={() => onCreate(name.trim() || "Untitled session", sym, tf, Number(bal) || 10000)}
            >
              <Plus className="h-4 w-4" /> Create & open
            </Button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your sessions</p>
            <div className="max-h-[46vh] space-y-1 overflow-y-auto pr-1">
              {sessions.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">No sessions yet.</p>}
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-border/60 p-2 text-xs",
                    s.id === activeId && "border-primary/50 bg-primary/5",
                    s.status === "archived" && "opacity-60",
                  )}
                >
                  <button className="min-w-0 flex-1 text-left" onClick={() => onOpenSession(s)}>
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.symbol} · {s.timeframe} · {formatMoney(Number(s.ending_balance), currency)}
                    </p>
                  </button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onArchive(s)} aria-label="Archive session">
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(s)} aria-label="Delete session">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
