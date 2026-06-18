import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENCIES, fromUsd, formatMoney } from "@/lib/currencies";
import { INSTRUMENTS } from "@/lib/trading";
import { Calculator, Wallet, Target, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lot-size")({
  head: () => ({ meta: [{ title: "Lot Size Calculator — Smart Trader Toolkit" }] }),
  component: LotSizePage,
});

function LotSizePage() {
  const [balance, setBalance] = useState(10000);
  const [currency, setCurrency] = useState("USD");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [mode, setMode] = useState<"percent" | "fixed">("percent");
  const [riskPct, setRiskPct] = useState(1);
  const [riskAmt, setRiskAmt] = useState(100);
  const [slPips, setSlPips] = useState(20);
  const [tpPips, setTpPips] = useState(40);
  const [symbol, setSymbol] = useState("EURUSD");

  const inst = INSTRUMENTS.find((i) => i.symbol === symbol)!;

  const result = useMemo(() => {
    // balance is already in user's selected currency; convert to USD for sizing math
    const riskInCurrency = mode === "percent" ? (balance * riskPct) / 100 : riskAmt;
    const usdRisk = riskInCurrency / (CURRENCIES.find((c) => c.code === currency)?.usdRate ?? 1);
    const lots = slPips > 0 ? usdRisk / (slPips * inst.pipValuePerLot) : 0;
    const usdReward = tpPips * inst.pipValuePerLot * lots;
    const reward = fromUsd(usdReward, currency);
    const rr = slPips > 0 ? tpPips / slPips : 0;
    return { riskInCurrency, lots, reward, rr };
  }, [balance, mode, riskPct, riskAmt, slPips, tpPips, inst, currency]);

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
                <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {(() => { const c = CURRENCIES.find((x) => x.code === currency); return c ? `${c.code} — ${c.name}` : "Select currency"; })()}
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search currency (NGN, Japan, Naira…)" />
                      <CommandList>
                        <CommandEmpty>No match.</CommandEmpty>
                        <CommandGroup>
                          {CURRENCIES.map((c) => (
                            <CommandItem key={c.code} value={`${c.code} ${c.name}`} onSelect={() => { setCurrency(c.code); setCurrencyOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", currency === c.code ? "opacity-100" : "opacity-0")} />
                              <span className="font-medium">{c.code}</span><span className="ml-2 text-muted-foreground">{c.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
          <ResultCard icon={Wallet} label="Risk Amount" value={formatMoney(result.riskInCurrency, currency)} sub={currency} accent="text-danger" />
          <ResultCard icon={Target} label="Potential Reward" value={formatMoney(result.reward, currency)} sub={currency} accent="text-success" />
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
