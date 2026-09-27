import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Crosshair } from "lucide-react";
import { calculatePosition, type InstrumentSpec } from "@/lib/instruments";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";

export type NewOrder = {
  direction: "long" | "short";
  order_type: "market" | "limit" | "stop";
  entry: number | null;
  sl: number | null;
  tp: number | null;
  lots: number;
  risk_pct: number | null;
  risk_amount: number | null;
};

export function OrderTicket({
  spec, accountCurrency, balance, price, defaultRiskPct, disabled, onSubmit,
}: {
  spec: InstrumentSpec;
  accountCurrency: string;
  balance: number;
  price: number;
  defaultRiskPct: number;
  disabled?: boolean;
  onSubmit: (o: NewOrder) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mode, setMode] = useState<"market" | "limit" | "stop">("market");
  const [sizing, setSizing] = useState<"risk" | "lots">("risk");
  const [riskPct, setRiskPct] = useState(String(defaultRiskPct));
  const [lots, setLots] = useState("0.10");
  const [slPips, setSlPips] = useState("20");
  const [tpPips, setTpPips] = useState("40");
  const [entryPrice, setEntryPrice] = useState("");
  const [useSl, setUseSl] = useState(true);
  const [useTp, setUseTp] = useState(true);

  const refPrice = mode === "market" ? price : Number(entryPrice) || price;

  const computed = useMemo(() => {
    const slDistance = (Number(slPips) || 0) * spec.pipSize;
    const riskAmount = (balance * (Number(riskPct) || 0)) / 100;
    const pos = calculatePosition({
      spec,
      accountCurrency,
      riskAmountAccountCcy: riskAmount,
      priceDistance: slDistance,
    });
    return { slDistance, riskAmount, autoLots: pos.lots, warnings: pos.warnings, pipValue: pos.pipValueAccountCcy };
  }, [slPips, riskPct, balance, spec, accountCurrency]);

  const finalLots = sizing === "risk" ? computed.autoLots : Number(lots) || 0;

  function build(direction: "long" | "short"): NewOrder {
    const sign = direction === "long" ? 1 : -1;
    const sl = useSl && Number(slPips) > 0 ? refPrice - sign * (Number(slPips) * spec.pipSize) : null;
    const tp = useTp && Number(tpPips) > 0 ? refPrice + sign * (Number(tpPips) * spec.pipSize) : null;
    return {
      direction,
      order_type: mode,
      entry: mode === "market" ? price : refPrice,
      sl,
      tp,
      lots: finalLots,
      risk_pct: sizing === "risk" ? Number(riskPct) || null : null,
      risk_amount: sizing === "risk" ? computed.riskAmount : null,
    };
  }

  const dirLabel = mode === "market" ? "" : ` ${mode}`;
  return (
    <div className="w-[248px] overflow-hidden rounded-md border border-border/60 bg-card/95 shadow-lg backdrop-blur">
      <div className="flex items-stretch gap-px bg-border/60">
        <button
          type="button"
          disabled={disabled || finalLots <= 0}
          onClick={() => onSubmit(build("short"))}
          className="flex flex-1 flex-col items-start bg-destructive px-2 py-1 text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          aria-label={`Sell${dirLabel}`}
        >
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase"><TrendingDown className="h-3 w-3" /> Sell{dirLabel}</span>
          <span className="font-mono text-xs font-semibold">{price ? price.toFixed(spec.digits) : "—"}</span>
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-14 flex-col items-center justify-center bg-card px-1 text-[10px] text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Show order options" : "Hide order options"}
        >
          <span className="font-mono font-semibold text-foreground">{finalLots.toFixed(2)}</span>
          {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>
        <button
          type="button"
          disabled={disabled || finalLots <= 0}
          onClick={() => onSubmit(build("long"))}
          className="flex flex-1 flex-col items-end bg-success px-2 py-1 text-success-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          aria-label={`Buy${dirLabel}`}
        >
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase">Buy{dirLabel} <TrendingUp className="h-3 w-3" /></span>
          <span className="font-mono text-xs font-semibold">{price ? price.toFixed(spec.digits) : "—"}</span>
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-2 p-2">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Crosshair className="h-3 w-3 text-primary" /> Order options
          </p>
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <TabsList className="grid h-8 w-full grid-cols-3">
              <TabsTrigger value="market" className="text-[11px]">Market</TabsTrigger>
              <TabsTrigger value="limit" className="text-[11px]">Limit</TabsTrigger>
              <TabsTrigger value="stop" className="text-[11px]">Stop</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode !== "market" && (
            <div>
              <Label className="text-[10px]">Entry price</Label>
              <Input
                className="h-8"
                inputMode="decimal"
                value={entryPrice}
                placeholder={price ? price.toFixed(spec.digits) : ""}
                onChange={(e) => setEntryPrice(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">SL (pips)</Label>
                <input type="checkbox" checked={useSl} onChange={(e) => setUseSl(e.target.checked)} className="h-3 w-3 accent-current" />
              </div>
              <Input className="h-8" inputMode="decimal" value={slPips} onChange={(e) => setSlPips(e.target.value)} disabled={!useSl} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">TP (pips)</Label>
                <input type="checkbox" checked={useTp} onChange={(e) => setUseTp(e.target.checked)} className="h-3 w-3 accent-current" />
              </div>
              <Input className="h-8" inputMode="decimal" value={tpPips} onChange={(e) => setTpPips(e.target.value)} disabled={!useTp} />
            </div>
          </div>

          <Tabs value={sizing} onValueChange={(v) => setSizing(v as typeof sizing)}>
            <TabsList className="grid h-7 w-full grid-cols-2">
              <TabsTrigger value="risk" className="text-[10px]">Risk %</TabsTrigger>
              <TabsTrigger value="lots" className="text-[10px]">Fixed lots</TabsTrigger>
            </TabsList>
          </Tabs>

          {sizing === "risk" ? (
            <div>
              <Label className="text-[10px]">Risk of {formatMoney(balance, accountCurrency)}</Label>
              <div className="flex items-center gap-2">
                <Input className="h-8" inputMode="decimal" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
                <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                  {formatMoney(computed.riskAmount, accountCurrency)}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-[10px]">Lots</Label>
              <Input className="h-8" inputMode="decimal" value={lots} onChange={(e) => setLots(e.target.value)} />
            </div>
          )}

          <div className="rounded-md bg-muted/50 px-2 py-1.5 text-[11px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span className="font-semibold">{finalLots.toFixed(2)} lots</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pip value</span><span>{formatMoney(computed.pipValue * (finalLots || 0), accountCurrency)}</span></div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">R:R</span>
              <span>{Number(slPips) > 0 ? (Number(tpPips) / Number(slPips)).toFixed(2) : "—"}</span>
            </div>
          </div>

          {computed.warnings.map((w) => (
            <p key={w} className="text-[10px] text-destructive">{w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
