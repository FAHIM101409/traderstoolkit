import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROP_FIRMS } from "@/lib/trading";
import { Progress } from "@/components/ui/progress";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/simulator")({
  head: () => ({ meta: [{ title: "Prop Firm Simulator — Smart Trader Toolkit" }] }),
  component: SimPage,
});

type Day = { id: string; day: number; pnl: number };

function SimPage() {
  const [firmId, setFirmId] = useState(PROP_FIRMS[0].id);
  const [balance, setBalance] = useState(100000);
  const [days, setDays] = useState<Day[]>([]);
  const [dayPnl, setDayPnl] = useState("");

  const firm = PROP_FIRMS.find((f) => f.id === firmId)!;
  const targetUSD = balance * (firm.profitTarget / 100);
  const maxDDUSD = balance * (firm.maxDD / 100);
  const dailyDDUSD = balance * (firm.dailyDD / 100);

  const stats = useMemo(() => {
    let peak = balance;
    let cur = balance;
    let maxDrawdown = 0;
    let breached: string | null = null;
    for (const d of days) {
      if (Math.abs(Math.min(d.pnl, 0)) > dailyDDUSD && !breached) breached = `Day ${d.day}: daily loss ${d.pnl.toFixed(0)} exceeded ${dailyDDUSD.toFixed(0)}`;
      cur += d.pnl;
      peak = Math.max(peak, cur);
      const dd = peak - cur;
      maxDrawdown = Math.max(maxDrawdown, dd);
      if (dd > maxDDUSD && !breached) breached = `Day ${d.day}: max drawdown breached`;
    }
    const profit = cur - balance;
    const passed = profit >= targetUSD && !breached;
    return { cur, profit, maxDrawdown, breached, passed };
  }, [days, balance, dailyDDUSD, maxDDUSD, targetUSD]);

  function addDay() {
    const v = Number(dayPnl);
    if (!Number.isFinite(v)) return;
    setDays((d) => [...d, { id: crypto.randomUUID(), day: d.length + 1, pnl: v }]);
    setDayPnl("");
  }

  return (
    <AppShell title="Prop Firm Simulator">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <Label>Prop Firm</Label>
              <Select value={firmId} onValueChange={setFirmId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROP_FIRMS.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Account Size (USD)</Label>
              <Input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))} />
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-md border border-border/60 bg-card/40 p-3 text-xs">
              <Stat label="Target" value={`$${targetUSD.toLocaleString()}`} />
              <Stat label="Daily DD" value={`$${dailyDDUSD.toLocaleString()}`} />
              <Stat label="Max DD" value={`$${maxDDUSD.toLocaleString()}`} />
            </div>
            <div className="flex gap-2">
              <Input type="number" placeholder="Day P&L (e.g. 1200 or -800)" value={dayPnl} onChange={(e) => setDayPnl(e.target.value)} />
              <Button onClick={addDay}>Add Day</Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDays([])} disabled={!days.length}><Trash2 className="mr-2 h-3 w-3" /> Reset days</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Balance" value={`$${stats.cur.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
              <Stat label="Profit" value={`$${stats.profit.toFixed(0)}`} tone={stats.profit >= 0 ? "good" : "bad"} />
              <Stat label="Max Drawdown" value={`$${stats.maxDrawdown.toFixed(0)}`} />
              <Stat label="Status" value={stats.breached ? "Breached" : stats.passed ? "Passed" : "Active"} tone={stats.breached ? "bad" : stats.passed ? "good" : "neutral"} />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Progress to target</p>
              <Progress value={Math.max(0, Math.min(100, (stats.profit / targetUSD) * 100))} />
            </div>
            {stats.breached && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">⚠ {stats.breached}</div>}
            <div className="max-h-[280px] overflow-y-auto rounded-md border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-card/60 text-xs text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left">Day</th><th className="px-3 py-2 text-right">P&L</th></tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.id} className="border-t border-border/40">
                      <td className="px-3 py-2">Day {d.day}</td>
                      <td className={`px-3 py-2 text-right ${d.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{d.pnl >= 0 ? "+" : ""}{d.pnl.toFixed(2)}</td>
                    </tr>
                  ))}
                  {!days.length && <tr><td colSpan={2} className="px-3 py-6 text-center text-xs text-muted-foreground">No days logged yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "neutral" }) {
  const c = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-rose-400" : "text-foreground";
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base font-semibold ${c}`}>{value}</p>
    </div>
  );
}