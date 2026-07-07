import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, ChevronsUpDown, Calculator, Wallet, Target, Activity, AlertTriangle, Info, Cable } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENCIES, formatMoney } from "@/lib/currencies";
import { INSTRUMENT_SPECS, getSpec, calculatePosition, convertCurrency, type InstrumentGroup } from "@/lib/instruments";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/lot-size")({
  head: () => ({ meta: [{ title: "Lot Size Calculator — Traders Toolkit" }] }),
  component: LotSizePage,
});

const GROUPS: InstrumentGroup[] = [
  "Forex Major", "Forex Minor", "Forex Cross", "Forex Exotic",
  "Metals", "Indices", "Commodities", "Crypto",
];

function LotSizePage() {
  const [balance, setBalance] = useState(10000);
  const [currency, setCurrency] = useState("USD");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [riskMode, setRiskMode] = useState<"percent" | "fixed">("percent");
  const [calcMethod, setCalcMethod] = useState<"pips" | "price">("pips");
  const [riskPct, setRiskPct] = useState(1);
  const [riskAmt, setRiskAmt] = useState(100);
  const [slPips, setSlPips] = useState(20);
  const [tpPips, setTpPips] = useState(40);
  const [symbol, setSymbol] = useState("EURUSD");
  const [entryPrice, setEntryPrice] = useState<number>(1.08);
  const [stopPrice, setStopPrice] = useState<number>(1.078);
  const [mt5Currency, setMt5Currency] = useState<string | null>(null);
  const [mt5Balance, setMt5Balance] = useState<number | null>(null);

  const spec = getSpec(symbol);

  // Pull broker context if MT5 is connected — user can still override.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mt5_accounts")
        .select("currency,balance,status")
        .maybeSingle();
      if (data?.currency) setMt5Currency(data.currency);
      if (typeof data?.balance === "number") setMt5Balance(data.balance);
    })();
  }, []);

  // Refresh reference entry/stop when the symbol changes.
  useEffect(() => {
    const s = getSpec(symbol);
    const step = s.pipSize * 20;
    setEntryPrice(Number(s.referencePrice.toFixed(s.digits)));
    setStopPrice(Number((s.referencePrice - step).toFixed(s.digits)));
  }, [symbol]);

  const result = useMemo(() => {
    const riskInAccountCcy = riskMode === "percent" ? (balance * riskPct) / 100 : riskAmt;
    const priceDistance = calcMethod === "pips"
      ? Math.max(slPips, 0) * spec.pipSize
      : Math.abs((entryPrice || 0) - (stopPrice || 0));

    const errors: string[] = [];
    if (!(balance > 0)) errors.push("Account balance must be greater than zero.");
    if (!(riskInAccountCcy > 0)) errors.push("Risk amount must be greater than zero.");
    if (!(priceDistance > 0)) {
      errors.push(calcMethod === "pips"
        ? "Stop-loss distance (pips) must be greater than zero."
        : "Entry price and stop-loss price cannot be equal.");
    }

    const calc = calculatePosition({
      spec,
      accountCurrency: currency,
      riskAmountAccountCcy: riskInAccountCcy,
      priceDistance,
    });

    // Reward (based on TP pips in pips mode, or symmetric RR in price mode)
    const rewardPriceDistance = calcMethod === "pips"
      ? Math.max(tpPips, 0) * spec.pipSize
      : priceDistance * 2;
    const reward = calc.lots * spec.contractSize * rewardPriceDistance * calc.quoteToAccountRate;
    const rr = priceDistance > 0 ? rewardPriceDistance / priceDistance : 0;

    return { riskInAccountCcy, priceDistance, calc, reward, rr, errors };
  }, [balance, currency, riskMode, riskPct, riskAmt, calcMethod, slPips, tpPips, entryPrice, stopPrice, spec]);

  return (
    <AppShell title="Lot Size Calculator">
      <p className="mb-6 text-sm text-muted-foreground">
        Institution-grade position sizing — Forex, metals, indices, commodities & crypto. Broker-accurate math, universal currency conversion, dual calculation modes.
      </p>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 border-border/60 bg-card">
          <CardContent className="space-y-5 p-6">
            {mt5Currency && (
              <Alert className="border-primary/40 bg-primary/5">
                <Cable className="h-4 w-4 text-primary" />
                <AlertDescription className="flex items-center justify-between gap-3 text-xs">
                  <span>MT5 account detected — {mt5Currency}{mt5Balance ? ` · ${formatMoney(mt5Balance, mt5Currency)}` : ""}.</span>
                  <Button size="sm" variant="outline" onClick={() => { setCurrency(mt5Currency); if (mt5Balance) setBalance(mt5Balance); }}>
                    Use MT5 values
                  </Button>
                </AlertDescription>
              </Alert>
            )}

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

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Risk Mode</Label>
                <Tabs value={riskMode} onValueChange={(v) => setRiskMode(v as "percent" | "fixed")} className="mt-1">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="percent">% of Account</TabsTrigger>
                    <TabsTrigger value="fixed">Fixed Amount</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="mt-3">
                  {riskMode === "percent" ? (
                    <Input type="number" step="0.1" value={riskPct} onChange={(e) => setRiskPct(+e.target.value)} />
                  ) : (
                    <Input type="number" value={riskAmt} onChange={(e) => setRiskAmt(+e.target.value)} />
                  )}
                </div>
              </div>
              <div>
                <Label>Trading Symbol</Label>
                <Popover open={symbolOpen} onOpenChange={setSymbolOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="mt-1 w-full justify-between font-normal">
                      {spec.label}
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search (GBP, JPY, XAU, BTC, US30…)" />
                      <CommandList>
                        <CommandEmpty>No match.</CommandEmpty>
                        {GROUPS.map((g) => {
                          const items = INSTRUMENT_SPECS.filter((i) => i.group === g);
                          if (!items.length) return null;
                          return (
                            <CommandGroup key={g} heading={g}>
                              {items.map((i) => (
                                <CommandItem key={i.symbol} value={`${i.symbol} ${i.label}`} onSelect={() => { setSymbol(i.symbol); setSymbolOpen(false); }}>
                                  <Check className={cn("mr-2 h-4 w-4", symbol === i.symbol ? "opacity-100" : "opacity-0")} />
                                  <span className="font-medium">{i.symbol}</span>
                                  <span className="ml-2 text-muted-foreground">{i.label}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          );
                        })}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label>Calculation Method</Label>
              <Tabs value={calcMethod} onValueChange={(v) => setCalcMethod(v as "pips" | "price")} className="mt-1">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pips">Stop Loss (Pips)</TabsTrigger>
                  <TabsTrigger value="price">Entry & Stop Loss Price</TabsTrigger>
                </TabsList>
              </Tabs>

              {calcMethod === "pips" ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Stop Loss (pips)</Label>
                    <Input type="number" value={slPips} onChange={(e) => setSlPips(+e.target.value)} />
                  </div>
                  <div>
                    <Label>Take Profit (pips)</Label>
                    <Input type="number" value={tpPips} onChange={(e) => setTpPips(+e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Entry Price</Label>
                    <Input type="number" step={spec.tickSize} value={entryPrice} onChange={(e) => setEntryPrice(+e.target.value)} />
                    <p className="mt-1 text-xs text-muted-foreground">Reference ~ {spec.referencePrice.toFixed(spec.digits)}</p>
                  </div>
                  <div>
                    <Label>Stop Loss Price</Label>
                    <Input type="number" step={spec.tickSize} value={stopPrice} onChange={(e) => setStopPrice(+e.target.value)} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Distance: {Math.abs(entryPrice - stopPrice).toFixed(spec.digits)} ({(Math.abs(entryPrice - stopPrice) / spec.pipSize).toFixed(1)} pips)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4 text-xs">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {result.calc.warnings.length > 0 && result.errors.length === 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4 text-xs">
                    {result.calc.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-3">
          <ResultCard icon={Calculator} label="Lot Size" value={result.calc.lots.toFixed(2)} sub={`${spec.label} • ${spec.group}`} accent="text-primary" />
          <ResultCard icon={Wallet} label="Risk Amount" value={formatMoney(result.riskInAccountCcy, currency)} sub={currency} accent="text-danger" />
          <ResultCard icon={Target} label="Potential Reward" value={formatMoney(result.reward, currency)} sub={currency} accent="text-success" />
          <ResultCard icon={Activity} label="Risk : Reward" value={`1 : ${result.rr.toFixed(2)}`} sub="Per trade" accent="text-accent" />

          <Card className="border-border/60 bg-card">
            <CardContent className="space-y-2 p-5 text-xs">
              <p className="mb-2 text-sm font-semibold text-foreground">Calculation Breakdown</p>
              <Row k="Account Balance" v={formatMoney(balance, currency)} />
              <Row k="Account Currency" v={currency} />
              <Row k="Risk %" v={riskMode === "percent" ? `${riskPct}%` : "—"} />
              <Row k="Risk Amount" v={formatMoney(result.riskInAccountCcy, currency)} />
              <Row k="Entry Price" v={calcMethod === "price" ? entryPrice.toFixed(spec.digits) : "—"} />
              <Row k="Stop Loss" v={calcMethod === "price" ? stopPrice.toFixed(spec.digits) : `${slPips} pips`} />
              <Row k="Price Distance" v={result.priceDistance.toFixed(spec.digits)} />
              <Row k="Pip Distance" v={result.calc.pipDistance.toFixed(1)} />
              <Row k="Pip Value / lot" v={`${result.calc.pipValueAccountCcy.toFixed(2)} ${currency}`} />
              <Row k="Tick Value / lot" v={`${result.calc.tickValueAccountCcy.toFixed(4)} ${currency}`} />
              <Row k="Contract Size" v={spec.contractSize.toLocaleString()} />
              <Row k="Quote → Account FX" v={`1 ${spec.quoteCurrency} = ${result.calc.quoteToAccountRate.toFixed(4)} ${currency}`} />
              <Row k="Lot Step / Min / Max" v={`${spec.lotStep} / ${spec.minLot} / ${spec.maxLot}`} />
              <div className="mt-2 border-t border-border/60 pt-2">
                <Row k="Final Lot Size" v={result.calc.lots.toFixed(2)} strong />
                <Row k="Effective Risk" v={formatMoney(result.calc.effectiveRisk, currency)} strong />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("font-mono", strong ? "font-semibold text-foreground" : "text-foreground/90")}>{v}</span>
    </div>
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
