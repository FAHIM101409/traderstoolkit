import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { createChart, CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi, type CandlestickData, type UTCTimestamp } from "lightweight-charts";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Play, Pause, SkipForward, RotateCcw, TrendingUp, TrendingDown, Save, Lock, Sparkles } from "lucide-react";
import { INSTRUMENTS } from "@/lib/trading";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UpgradeDialog } from "@/components/app/upgrade-dialog";

export const Route = createFileRoute("/_authenticated/replay")({
  head: () => ({ meta: [{ title: "Backtesting Station — Smart Trader Toolkit" }] }),
  component: ReplayPage,
});

type Candle = CandlestickData<UTCTimestamp>;
type Replay = { id: string; dir: "long" | "short"; entry: number; sl: number; tp: number; lots: number; openedAt: number; closedAt?: number; exit?: number; pnl?: number; outcome?: "tp" | "sl" | "manual" };

// Deterministic geometric-Brownian-motion candle generator so the chart is reproducible per symbol.
function genCandles(symbol: string, count: number, basePrice: number, vol: number): Candle[] {
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed = (seed * 31 + symbol.charCodeAt(i)) >>> 0;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const candles: Candle[] = [];
  let price = basePrice;
  const startTs = Math.floor(Date.now() / 1000) - count * 3600;
  for (let i = 0; i < count; i++) {
    const open = price;
    const move = (rng() - 0.5) * 2 * vol * price;
    const close = Math.max(open + move, basePrice * 0.5);
    const high = Math.max(open, close) + rng() * vol * price * 0.5;
    const low = Math.min(open, close) - rng() * vol * price * 0.5;
    candles.push({ time: (startTs + i * 3600) as UTCTimestamp, open, high, low, close });
    price = close;
  }
  return candles;
}

const PRESETS: Record<string, { base: number; vol: number }> = {
  EURUSD: { base: 1.08, vol: 0.003 },
  GBPUSD: { base: 1.27, vol: 0.0035 },
  USDJPY: { base: 152, vol: 0.003 },
  XAUUSD: { base: 2350, vol: 0.005 },
  BTCUSD: { base: 65000, vol: 0.012 },
  ETHUSD: { base: 3200, vol: 0.015 },
  NAS100: { base: 18500, vol: 0.006 },
};

function ReplayPage() {
  const { user } = useAuth();
  const { isPro, loading } = useProfile();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [symbol, setSymbol] = useState("EURUSD");
  const [startBalance, setStartBalance] = useState(10000);
  const [lots, setLots] = useState("0.10");
  const [slPips, setSlPips] = useState("20");
  const [tpPips, setTpPips] = useState("40");
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(50);
  const [trades, setTrades] = useState<Replay[]>([]);
  const [openTrade, setOpenTrade] = useState<Replay | null>(null);

  const FREE_MAX = 365 * 24; // 1 year of hourly candles
  const PRO_MAX = 5 * 365 * 24;
  const totalCandles = isPro ? PRO_MAX : FREE_MAX;

  const preset = PRESETS[symbol] ?? { base: 100, vol: 0.005 };
  const candles = useMemo(() => genCandles(symbol, totalCandles, preset.base, preset.vol), [symbol, totalCandles, preset.base, preset.vol]);
  const inst = INSTRUMENTS.find((i) => i.symbol === symbol) ?? INSTRUMENTS[0];

  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const slRef = useRef<ISeriesApi<"Line"> | null>(null);
  const tpRef = useRef<ISeriesApi<"Line"> | null>(null);
  const entryRef = useRef<ISeriesApi<"Line"> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: "transparent" }, textColor: "#9CA3AF" },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height: 420,
    });
    chartRef.current = chart;
    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981", downColor: "#ef4444", wickUpColor: "#10b981", wickDownColor: "#ef4444", borderVisible: false,
    });
    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; seriesRef.current = null; slRef.current = null; tpRef.current = null; entryRef.current = null; };
  }, []);

  // Push visible slice into the series
  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(candles.slice(0, cursor));
  }, [candles, cursor]);

  // Auto-play
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setCursor((c) => {
        if (c >= candles.length) { setPlaying(false); return c; }
        return c + 1;
      });
    }, Math.max(20, 500 / speed));
    return () => clearInterval(id);
  }, [playing, speed, candles.length]);

  // Check SL/TP for open trade against the latest visible candle
  useEffect(() => {
    if (!openTrade) return;
    const last = candles[cursor - 1];
    if (!last) return;
    const hitTp = openTrade.dir === "long" ? last.high >= openTrade.tp : last.low <= openTrade.tp;
    const hitSl = openTrade.dir === "long" ? last.low <= openTrade.sl : last.high >= openTrade.sl;
    if (hitTp || hitSl) {
      const exit = hitTp ? openTrade.tp : openTrade.sl;
      closeAt(exit, hitTp ? "tp" : "sl");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  // Render entry/SL/TP overlay lines
  useEffect(() => {
    if (!chartRef.current) return;
    [entryRef, slRef, tpRef].forEach((r) => { if (r.current) { chartRef.current?.removeSeries(r.current); r.current = null; } });
    if (!openTrade) return;
    const visible = candles.slice(0, cursor);
    if (visible.length === 0) return;
    const range = visible.filter((c) => c.time >= (openTrade.openedAt as UTCTimestamp));
    const line = (color: string, price: number) => {
      const s = chartRef.current!.addSeries(LineSeries, { color, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
      s.setData(range.map((c) => ({ time: c.time, value: price })));
      return s;
    };
    entryRef.current = line("#6366f1", openTrade.entry);
    tpRef.current = line("#10b981", openTrade.tp);
    slRef.current = line("#ef4444", openTrade.sl);
  }, [openTrade, cursor, candles]);

  function currentPrice() {
    return candles[cursor - 1]?.close ?? candles[0].close;
  }

  function openAt(dir: "long" | "short") {
    if (openTrade) return toast.error("Close the active trade first");
    const p = currentPrice();
    const slDist = +slPips * inst.pipSize;
    const tpDist = +tpPips * inst.pipSize;
    const sl = dir === "long" ? p - slDist : p + slDist;
    const tp = dir === "long" ? p + tpDist : p - tpDist;
    const t: Replay = { id: crypto.randomUUID(), dir, entry: p, sl, tp, lots: +lots, openedAt: candles[cursor - 1].time as number };
    setOpenTrade(t);
    toast.success(`${dir.toUpperCase()} @ ${p.toFixed(5)}`);
  }

  function closeAt(exit: number, outcome: Replay["outcome"]) {
    if (!openTrade) return;
    const pipsMoved = (openTrade.dir === "long" ? exit - openTrade.entry : openTrade.entry - exit) / inst.pipSize;
    const pnl = pipsMoved * inst.pipValuePerLot * openTrade.lots;
    const closed = { ...openTrade, exit, closedAt: candles[cursor - 1].time as number, pnl, outcome };
    setTrades((arr) => [...arr, closed]);
    setOpenTrade(null);
    toast(outcome === "tp" ? "Hit TP" : outcome === "sl" ? "Hit SL" : "Closed manually", { description: `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}` });
  }

  function closeNow() {
    if (!openTrade) return;
    closeAt(currentPrice(), "manual");
  }

  function reset() {
    setCursor(50); setTrades([]); setOpenTrade(null); setPlaying(false);
  }

  const stats = useMemo(() => {
    let bal = startBalance;
    const eq = [{ i: 0, bal }];
    let wins = 0, losses = 0, grossWin = 0, grossLoss = 0;
    trades.forEach((t, i) => {
      bal += t.pnl ?? 0;
      eq.push({ i: i + 1, bal: +bal.toFixed(2) });
      if ((t.pnl ?? 0) > 0) { wins++; grossWin += t.pnl!; }
      else if ((t.pnl ?? 0) < 0) { losses++; grossLoss += Math.abs(t.pnl!); }
    });
    const total = wins + losses;
    const winRate = total ? Math.round((wins / total) * 100) : 0;
    const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;
    let peak = startBalance, dd = 0;
    eq.forEach((p) => { peak = Math.max(peak, p.bal); dd = Math.max(dd, ((peak - p.bal) / peak) * 100); });
    return { eq, bal, wins, losses, winRate, pf, dd };
  }, [trades, startBalance]);

  async function saveSession() {
    if (!user) return;
    const { error } = await supabase.from("backtest_sessions").insert({
      user_id: user.id, name: `${symbol} replay`, symbol, timeframe: "1h",
      starting_balance: startBalance, ending_balance: stats.bal,
      trades: JSON.parse(JSON.stringify(trades)),
      stats: JSON.parse(JSON.stringify(stats)),
    });
    if (error) toast.error(error.message);
    else toast.success("Backtest session saved");
  }

  if (loading) return null;

  return (
    <AppShell title="Backtesting Station">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">Bar-by-bar replay · Practice entries with live SL/TP simulation.</p>
        {!isPro && (
          <Badge variant="outline" className="gap-1 border-primary/40 text-primary"><Lock className="h-3 w-3" /> Free: 1 year of history</Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card><CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(PRESETS).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center gap-1 rounded-md border border-border/60 p-1">
              <Button size="sm" variant={playing ? "secondary" : "ghost"} onClick={() => setPlaying((p) => !p)}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCursor((c) => Math.min(candles.length, c + 1))}><SkipForward className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>
            </div>
            <Select value={String(speed)} onValueChange={(v) => setSpeed(+v)}>
              <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>{[0.5,1,2,5,10,20].map((s) => <SelectItem key={s} value={String(s)}>{s}×</SelectItem>)}</SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">Bar {cursor} / {candles.length}</Badge>
          </div>
          <div ref={containerRef} className="w-full overflow-hidden rounded-md border border-border/60 bg-card/40" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Price: <span className="font-mono text-foreground">{currentPrice().toFixed(inst.pipSize < 0.01 ? 5 : 2)}</span></span>
            {openTrade && (
              <Badge variant="outline" className={openTrade.dir === "long" ? "border-success/40 text-success" : "border-danger/40 text-danger"}>
                {openTrade.dir.toUpperCase()} @ {openTrade.entry.toFixed(5)}
              </Badge>
            )}
          </div>
        </CardContent></Card>

        <div className="space-y-3">
          <Card><CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Trade</h3>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Lots</Label><Input value={lots} onChange={(e) => setLots(e.target.value)} /></div>
              <div><Label className="text-xs">SL pips</Label><Input value={slPips} onChange={(e) => setSlPips(e.target.value)} /></div>
              <div><Label className="text-xs">TP pips</Label><Input value={tpPips} onChange={(e) => setTpPips(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => openAt("long")} className="bg-success text-white hover:bg-success/90"><TrendingUp className="mr-1 h-4 w-4" />Buy</Button>
              <Button onClick={() => openAt("short")} className="bg-danger text-white hover:bg-danger/90"><TrendingDown className="mr-1 h-4 w-4" />Sell</Button>
            </div>
            <Button variant="outline" disabled={!openTrade} onClick={closeNow} className="w-full">Close at market</Button>
          </CardContent></Card>

          <Card><CardContent className="space-y-2 p-4">
            <h3 className="text-sm font-semibold">Session</h3>
            <div><Label className="text-xs">Start balance</Label><Input type="number" value={startBalance} onChange={(e) => setStartBalance(+e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Stat l="Balance" v={`$${stats.bal.toFixed(0)}`} />
              <Stat l="Trades" v={String(trades.length)} />
              <Stat l="Win %" v={`${stats.winRate}%`} />
              <Stat l="PF" v={stats.pf.toFixed(2)} />
              <Stat l="Max DD" v={`${stats.dd.toFixed(1)}%`} />
              <Stat l="W/L" v={`${stats.wins}/${stats.losses}`} />
            </div>
            <Button variant="outline" onClick={saveSession} disabled={!trades.length} className="w-full gap-2 mt-2"><Save className="h-4 w-4" /> Save session</Button>
          </CardContent></Card>
        </div>
      </div>

      <Card className="mt-4"><CardContent className="p-4">
        <h3 className="mb-2 text-sm font-semibold">Equity curve</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={stats.eq}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="i" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={["auto","auto"]} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
            <Line type="monotone" dataKey="bal" stroke="#6366f1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent></Card>

      {!isPro && (
        <Card className="mt-4 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
          <CardContent className="flex flex-col items-center justify-between gap-3 p-5 text-center sm:flex-row sm:text-left">
            <div>
              <p className="font-semibold">Unlock unlimited historical replay</p>
              <p className="text-sm text-muted-foreground">Pro gives you 5+ years of bar-by-bar data and unlimited backtests.</p>
            </div>
            <Button onClick={() => setUpgradeOpen(true)} className="gap-2"><Sparkles className="h-4 w-4" /> Upgrade — $29/mo</Button>
          </CardContent>
        </Card>
      )}
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </AppShell>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return <div className="rounded-md border border-border/60 bg-card/40 p-2"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p><p className="mt-0.5 text-sm font-semibold">{v}</p></div>;
}
