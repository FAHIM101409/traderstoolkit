import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, X, Shield, Percent } from "lucide-react";
import type { BacktestTrade } from "@/lib/backtest";
import type { InstrumentSpec } from "@/lib/instruments";
import { formatMoney } from "@/lib/currencies";
import { pnlFor } from "@/lib/replay-sim";
import { cn } from "@/lib/utils";

export function PositionsDock({
  trades, spec, accountCurrency, price, commissionPerLot, spreadPoints,
  onClose, onCancel, onBreakEven, onNudge,
}: {
  trades: BacktestTrade[];
  spec: InstrumentSpec;
  accountCurrency: string;
  price: number;
  commissionPerLot: number;
  spreadPoints: number;
  onClose: (t: BacktestTrade) => void;
  onCancel: (t: BacktestTrade) => void;
  onBreakEven: (t: BacktestTrade) => void;
  onNudge: (t: BacktestTrade, key: "sl" | "tp", pips: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const ctx = { spec, accountCurrency, commissionPerLot, spreadPoints };

  const open = trades.filter((t) => t.status === "open");
  const pending = trades.filter((t) => t.status === "pending");
  const closed = trades.filter((t) => t.status === "closed").slice(0, 40);

  const floating = open.reduce((s, t) => s + (t.entry != null ? pnlFor(ctx, t.direction, t.entry, price, t.lots) : 0), 0);

  return (
    <div className="w-full shrink-0 border-t border-border/60 bg-card">
      <button onClick={() => setCollapsed((c) => !c)} className="flex h-7 w-full items-center justify-between px-3 hover:bg-muted/40" aria-label="Toggle trading panel">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Trading Panel</span>
        <span className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">{open.length} open · {pending.length} pending</Badge>
          <span className={cn("text-xs font-semibold", floating >= 0 ? "text-success" : "text-destructive")}>
            {formatMoney(floating, accountCurrency)}
          </span>
          {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {!collapsed && (
        <Tabs defaultValue="open" className="border-t border-border/60">
          <TabsList className="mx-2 my-1 h-7">
            <TabsTrigger value="open" className="text-[11px]">Open</TabsTrigger>
            <TabsTrigger value="pending" className="text-[11px]">Pending</TabsTrigger>
            <TabsTrigger value="history" className="text-[11px]">History</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="m-0 max-h-40 overflow-y-auto px-2 pb-2">
            {open.length === 0 && <Empty label="No open positions" />}
            {open.map((t) => {
              const pnl = t.entry != null ? pnlFor(ctx, t.direction, t.entry, price, t.lots) : 0;
              return (
                <div key={t.id} className="mb-1.5 rounded-lg border border-border/60 bg-background/60 p-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      <span className={t.direction === "long" ? "text-success" : "text-destructive"}>
                        {t.direction === "long" ? "BUY" : "SELL"}
                      </span>{" "}
                      {t.lots} {t.symbol} @ {t.entry?.toFixed(spec.digits)}
                    </span>
                    <span className={cn("font-semibold", pnl >= 0 ? "text-success" : "text-destructive")}>
                      {formatMoney(pnl, accountCurrency)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <LevelChip label="SL" value={t.sl} digits={spec.digits} onMinus={() => onNudge(t, "sl", -5)} onPlus={() => onNudge(t, "sl", 5)} />
                    <LevelChip label="TP" value={t.tp} digits={spec.digits} onMinus={() => onNudge(t, "tp", -5)} onPlus={() => onNudge(t, "tp", 5)} />
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => onBreakEven(t)}>
                      <Shield className="mr-1 h-3 w-3" /> BE
                    </Button>
                    <Button size="sm" variant="destructive" className="ml-auto h-6 px-2 text-[10px]" onClick={() => onClose(t)}>
                      Close
                    </Button>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="pending" className="m-0 max-h-40 overflow-y-auto px-2 pb-2">
            {pending.length === 0 && <Empty label="No pending orders" />}
            {pending.map((t) => (
              <div key={t.id} className="mb-1.5 flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 p-2 text-[11px]">
                <span>
                  <span className="font-semibold uppercase">{t.direction === "long" ? "Buy" : "Sell"} {t.order_type}</span>{" "}
                  {t.lots} @ {t.entry?.toFixed(spec.digits)}
                </span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => onCancel(t)}>
                  <X className="mr-1 h-3 w-3" /> Cancel
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="history" className="m-0 max-h-40 overflow-y-auto px-2 pb-2">
            {closed.length === 0 && <Empty label="No closed trades yet" />}
            {closed.map((t) => (
              <div key={t.id} className="mb-1 flex items-center justify-between rounded-md px-2 py-1 text-[11px] odd:bg-muted/30">
                <span className="truncate">
                  {t.direction === "long" ? "BUY" : "SELL"} {t.lots} · {t.entry?.toFixed(spec.digits)} → {t.exit?.toFixed(spec.digits)}
                  <span className="ml-1 uppercase text-muted-foreground">{t.exit_reason}</span>
                </span>
                <span className={cn("font-semibold", (t.pnl ?? 0) >= 0 ? "text-success" : "text-destructive")}>
                  {formatMoney(t.pnl ?? 0, accountCurrency)}
                </span>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="py-6 text-center text-[11px] text-muted-foreground">{label}</p>;
}

function LevelChip({
  label, value, digits, onMinus, onPlus,
}: { label: string; value: number | null; digits: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded border border-border/60 px-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-medium">{value != null ? value.toFixed(digits) : "—"}</span>
      <button onClick={onMinus} className="px-1 text-[10px] text-muted-foreground hover:text-foreground" aria-label={`${label} minus 5 pips`}>−</button>
      <button onClick={onPlus} className="px-1 text-[10px] text-muted-foreground hover:text-foreground" aria-label={`${label} plus 5 pips`}>+</button>
      <Percent className="hidden" />
    </span>
  );
}
