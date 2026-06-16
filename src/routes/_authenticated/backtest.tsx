import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INSTRUMENTS } from "@/lib/trading";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/backtest")({
  head: () => ({ meta: [{ title: "Backtesting Lab — Smart Trader Toolkit" }] }),
  component: BacktestPage,
});

type Sim = { id: string; pair: string; dir: "long" | "short"; entry: number; sl: number; tp: number; lots: number; outcome: "tp" | "sl" | "be" };

function BacktestPage() {
  const [start, setStart] = useState(10000);
  const [pair, setPair] = useState("EURUSD");
  const [dir, setDir] = useState<"long" | "short">("long");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [lots, setLots] = useState("0.10");
  const [outcome, setOutcome] = useState<"tp" | "sl" | "be">("tp");
  const [sims, setSims] = useState<Sim[]>([]);

  function add() {
    const inst = INSTRUMENTS.find((i) => i.symbol === pair)!;
    const e = +entry, s = +sl, t = +tp, l = +lots;
    if (![e,s,t,l].every(Number.isFinite)) return;
    setSims((arr) => [...arr, { id: crypto.randomUUID(), pair, dir, entry: e, sl: s, tp: t, lots: l, outcome }]);
    setEntry(""); setSl(""); setTp("");
    void inst;
  }

  const results = useMemo(() => {
    let bal = start; const eq: { i: number; bal: number }[] = [{ i: 0, bal: start }];
    let wins = 0, losses = 0;
    sims.forEach((s, i) => {
      const inst = INSTRUMENTS.find((x) => x.symbol === s.pair)!;
      const pipsRisk = Math.abs(s.entry - s.sl) / inst.pipSize;
      const pipsReward = Math.abs(s.tp - s.entry) / inst.pipSize;
      let pnl = 0;
      if (s.outcome === "tp") { pnl = pipsReward * inst.pipValuePerLot * s.lots; wins++; }
      else if (s.outcome === "sl") { pnl = -pipsRisk * inst.pipValuePerLot * s.lots; losses++; }
      bal += pnl;
      eq.push({ i: i + 1, bal: Number(bal.toFixed(2)) });
    });
    const total = wins + losses;
    return { eq, bal, wins, losses, winRate: total ? Math.round((wins / total) * 100) : 0 };
  }, [sims, start]);

  return (
    <AppShell title="Backtesting Lab">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardContent className="space-y-3 p-6">
            <div><Label>Starting Balance (USD)</Label><Input type="number" value={start} onChange={(e) => setStart(+e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Pair</Label>
                <Select value={pair} onValueChange={setPair}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INSTRUMENTS.map((i) => <SelectItem key={i.symbol} value={i.symbol}>{i.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Direction</Label>
                <Select value={dir} onValueChange={(v) => setDir(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="long">Long</SelectItem><SelectItem value="short">Short</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Entry</Label><Input type="number" step="any" value={entry} onChange={(e) => setEntry(e.target.value)} /></div>
              <div><Label>SL</Label><Input type="number" step="any" value={sl} onChange={(e) => setSl(e.target.value)} /></div>
              <div><Label>TP</Label><Input type="number" step="any" value={tp} onChange={(e) => setTp(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Lots</Label><Input type="number" step="0.01" value={lots} onChange={(e) => setLots(e.target.value)} /></div>
              <div><Label>Outcome</Label>
                <Select value={outcome} onValueChange={(v) => setOutcome(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tp">Hit TP</SelectItem>
                    <SelectItem value="sl">Hit SL</SelectItem>
                    <SelectItem value="be">Breakeven</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={add} className="flex-1">Add Trade</Button>
              <Button variant="ghost" size="icon" onClick={() => setSims([])} disabled={!sims.length}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <S l="Balance" v={`$${results.bal.toFixed(0)}`} />
              <S l="Trades" v={String(sims.length)} />
              <S l="Win Rate" v={`${results.winRate}%`} />
              <S l="W/L" v={`${results.wins}/${results.losses}`} />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={results.eq}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="i" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={["auto","auto"]} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="bal" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function S({ l, v }: { l: string; v: string }) {
  return <div className="rounded-md border border-border/60 bg-card/40 p-2"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p><p className="mt-1 text-sm font-semibold">{v}</p></div>;
}