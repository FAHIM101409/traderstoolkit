import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Shield, Wallet, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/risk")({
  head: () => ({ meta: [{ title: "Risk Manager — Smart Trader Toolkit" }] }),
  component: RiskPage,
});

function RiskPage() {
  const [account, setAccount] = useState(10000);
  const [dailyDD, setDailyDD] = useState(5);
  const [maxDD, setMaxDD] = useState(10);
  const [usedToday, setUsedToday] = useState(0);
  const [usedTotal, setUsedTotal] = useState(0);

  const calc = useMemo(() => {
    const dailyDollar = (account * dailyDD) / 100;
    const maxDollar = (account * maxDD) / 100;
    const remainingDaily = Math.max(0, dailyDollar - usedToday);
    const remainingTotal = Math.max(0, maxDollar - usedTotal);
    const safeRisk = Math.max(0, Math.min(remainingDaily, remainingTotal) * 0.25);
    return { dailyDollar, maxDollar, remainingDaily, remainingTotal, safeRisk };
  }, [account, dailyDD, maxDD, usedToday, usedTotal]);

  return (
    <AppShell title="Risk Manager">
      <p className="mb-6 text-sm text-muted-foreground">Protect your capital with daily and overall drawdown guardrails.</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card">
          <CardContent className="space-y-4 p-6">
            <div><Label>Account Size ($)</Label><Input type="number" value={account} onChange={(e) => setAccount(+e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Daily Drawdown (%)</Label><Input type="number" value={dailyDD} onChange={(e) => setDailyDD(+e.target.value)} /></div>
              <div><Label>Max Drawdown (%)</Label><Input type="number" value={maxDD} onChange={(e) => setMaxDD(+e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Used Today ($)</Label><Input type="number" value={usedToday} onChange={(e) => setUsedToday(+e.target.value)} /></div>
              <div><Label>Used Total ($)</Label><Input type="number" value={usedTotal} onChange={(e) => setUsedTotal(+e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card className="border-border/60 bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-danger" /> Daily Risk</span>
                <span>${calc.remainingDaily.toFixed(0)} / ${calc.dailyDollar.toFixed(0)}</span>
              </div>
              <Progress value={(usedToday / Math.max(calc.dailyDollar, 1)) * 100} className="mt-3" />
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Overall Risk</span>
                <span>${calc.remainingTotal.toFixed(0)} / ${calc.maxDollar.toFixed(0)}</span>
              </div>
              <Progress value={(usedTotal / Math.max(calc.maxDollar, 1)) * 100} className="mt-3" />
            </CardContent>
          </Card>
          <Card className="border-primary/40 bg-card shadow-glow">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/20"><Wallet className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Safe Risk Per Trade</p>
                <p className="text-2xl font-semibold text-primary">${calc.safeRisk.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">25% of remaining capacity</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
