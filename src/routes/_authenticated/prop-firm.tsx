import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { PROP_FIRMS } from "@/lib/trading";
import { Building2, AlertTriangle, ShieldCheck, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/prop-firm")({
  head: () => ({ meta: [{ title: "Prop Firm Drawdown — Smart Trader Toolkit" }] }),
  component: PropFirmPage,
});

function PropFirmPage() {
  const [firmId, setFirmId] = useState(PROP_FIRMS[0].id);
  const firm = PROP_FIRMS.find((f) => f.id === firmId)!;
  const [accountSize, setAccountSize] = useState(100000);
  const [currentEquity, setCurrentEquity] = useState(100000);
  const [todayLoss, setTodayLoss] = useState(0);
  const [riskPerTradePct, setRiskPerTradePct] = useState(0.5);
  const [dailyDD, setDailyDD] = useState(firm.dailyDD);
  const [maxDD, setMaxDD] = useState(firm.maxDD);

  function applyFirm(id: string) {
    setFirmId(id);
    const f = PROP_FIRMS.find((x) => x.id === id)!;
    setDailyDD(f.dailyDD);
    setMaxDD(f.maxDD);
  }

  const r = useMemo(() => {
    const dailyCap = (accountSize * dailyDD) / 100;
    const maxCap = (accountSize * maxDD) / 100;
    const totalLoss = Math.max(0, accountSize - currentEquity);
    const remainingDaily = Math.max(0, dailyCap - todayLoss);
    const remainingTotal = Math.max(0, maxCap - totalLoss);
    const riskDollar = (currentEquity * riskPerTradePct) / 100;
    const lossesLeft = riskDollar > 0 ? Math.floor(Math.min(remainingDaily, remainingTotal) / riskDollar) : 0;
    const profitTargetDollar = (accountSize * firm.profitTarget) / 100;
    return { dailyCap, maxCap, totalLoss, remainingDaily, remainingTotal, riskDollar, lossesLeft, profitTargetDollar };
  }, [accountSize, currentEquity, todayLoss, riskPerTradePct, dailyDD, maxDD, firm]);

  return (
    <AppShell title="Prop Firm Drawdown">
      <p className="mb-6 text-sm text-muted-foreground">Stay funded. Track daily and overall limits against your firm's rules.</p>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 border-border/60 bg-card">
          <CardContent className="space-y-4 p-6">
            <div>
              <Label>Prop Firm</Label>
              <Select value={firmId} onValueChange={applyFirm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROP_FIRMS.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Account Size ($)</Label><Input type="number" value={accountSize} onChange={(e) => setAccountSize(+e.target.value)} /></div>
              <div><Label>Current Equity ($)</Label><Input type="number" value={currentEquity} onChange={(e) => setCurrentEquity(+e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Today's Loss ($)</Label><Input type="number" value={todayLoss} onChange={(e) => setTodayLoss(+e.target.value)} /></div>
              <div><Label>Risk Per Trade (%)</Label><Input type="number" step="0.1" value={riskPerTradePct} onChange={(e) => setRiskPerTradePct(+e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Daily DD Rule (%)</Label><Input type="number" value={dailyDD} onChange={(e) => setDailyDD(+e.target.value)} /></div>
              <div><Label>Max DD Rule (%)</Label><Input type="number" value={maxDD} onChange={(e) => setMaxDD(+e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-3">
          <Card className="border-border/60 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-danger" /> Daily Remaining</span>
                <span>${r.remainingDaily.toFixed(0)} / ${r.dailyCap.toFixed(0)}</span>
              </div>
              <Progress value={(todayLoss / Math.max(r.dailyCap, 1)) * 100} className="mt-3" />
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Max DD Remaining</span>
                <span>${r.remainingTotal.toFixed(0)} / ${r.maxCap.toFixed(0)}</span>
              </div>
              <Progress value={(r.totalLoss / Math.max(r.maxCap, 1)) * 100} className="mt-3" />
            </CardContent>
          </Card>
          <Card className="border-primary/40 bg-card shadow-glow">
            <CardContent className="flex items-center gap-3 p-5">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Losses left at current risk</p>
                <p className="text-2xl font-semibold text-primary">{r.lossesLeft}</p>
                <p className="text-xs text-muted-foreground">${r.riskDollar.toFixed(2)} per trade</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card">
            <CardContent className="flex items-center gap-3 p-5">
              <Target className="h-5 w-5 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Profit Target ({firm.profitTarget}%)</p>
                <p className="text-2xl font-semibold text-success">${r.profitTargetDollar.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
