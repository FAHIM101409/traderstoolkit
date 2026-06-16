import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INSTRUMENTS } from "@/lib/trading";
import { Calculator, Wallet, Target, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lot-size")({
  head: () => ({ meta: [{ title: "Lot Size Calculator — Smart Trader Toolkit" }] }),
  component: LotSizePage,
});

function LotSizePage() {
  const [balance, setBalance] = useState(10000);
  const [currency, setCurrency] = useState("USD");
  const [mode, setMode] = useState<"percent" | "fixed">("percent");
  const [riskPct, setRiskPct] = useState(1);
  const [riskAmt, setRiskAmt] = useState(100);
  const [slPips, setSlPips] = useState(20);
  const [tpPips, setTpPips] = useState(40);
  const [symbol, setSymbol] = useState("EURUSD");

  const inst = INSTRUMENTS.find((i) => i.symbol === symbol)!;

  const result = useMemo(() => {
    const dollarRisk = mode === "percent" ? (balance * riskPct) / 100 : riskAmt;
    const lots = slPips > 0 ? dollarRisk / (slPips * inst.pipValuePerLot) : 0;
    const reward = tpPips * inst.pipValuePerLot * lots;
    const rr = slPips > 0 ? tpPips / slPips : 0;
    return { dollarRisk, lots, reward, rr };
  }, [balance, mode, riskPct, riskAmt, slPips, tpPips, inst]);

  return (
    <AppShell title="Lot Size Calculator">
      <p className="mb-6 text-sm text-muted-foreground">Precise position sizing across Forex, Gold, Indices and Crypto.</p>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 border-border/60 bg-card">
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Account Balance</Label>
                <Input type="number" value={balance} onChange={(e) => setBalance(+e.target.value)} />
              </div>
              <div>
                <Label>Account Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["USD","EUR","GBP","CAD","AUD"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Risk Mode</Label>
              <Tabs value={mode} onValueChange={(v) => setMode(v as "percent" | "fixed")} className="mt-1">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="percent">% of Account</TabsTrigger>
                  <TabsTrigger value="fixed">Fixed Amount</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="mt-3">
                {mode === "percent" ? (
                  <Input type="number" step="0.1" value={riskPct} onChange={(e) => setRiskPct(+e.target.value)} />
                ) : (
                  <Input type="number" value={riskAmt} onChange={(e) => setRiskAmt(+e.target.value)} />
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Stop Loss (pips)</Label>
                <Input type="number" value={slPips} onChange={(e) => setSlPips(+e.target.value)} />
              </div>
              <div>
                <Label>Take Profit (pips)</Label>
                <Input type="number" value={tpPips} onChange={(e) => setTpPips(+e.target.value)} />
              </div>
              <div>
                <Label>Trading Pair</Label>
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSTRUMENTS.map(i => <SelectItem key={i.symbol} value={i.symbol}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-3">
          <ResultCard icon={Calculator} label="Lot Size" value={result.lots.toFixed(2)} sub={`${inst.label} • ${inst.group}`} accent="text-primary" />
          <ResultCard icon={Wallet} label="Dollar Risk" value={`$${result.dollarRisk.toFixed(2)}`} sub={currency} accent="text-danger" />
          <ResultCard icon={Target} label="Potential Reward" value={`$${result.reward.toFixed(2)}`} sub={currency} accent="text-success" />
          <ResultCard icon={Activity} label="Risk : Reward" value={`1 : ${result.rr.toFixed(2)}`} sub="Per trade" accent="text-accent" />
        </div>
      </div>
    </AppShell>
  );
}

function ResultCard({ icon: Icon, label, value, sub, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; accent: string }) {
  return (
    <Card className="border-border/60 bg-card shadow-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-semibold ${accent}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
