import type { Candle } from "./marketdata";
import type { InstrumentSpec } from "./instruments";
import { convertCurrency } from "./instruments";
import type { BacktestTrade } from "./backtest";

export type SimContext = {
  spec: InstrumentSpec;
  accountCurrency: string;
  /** Commission charged per lot per round turn, in the account currency. */
  commissionPerLot: number;
  /** Spread in points (tickSize units) applied to fills. */
  spreadPoints: number;
};

export type SimEvent = {
  kind: "filled" | "closed" | "cancelled";
  tradeId: string;
  message: string;
};

export function pnlFor(ctx: SimContext, direction: "long" | "short", entry: number, mark: number, lots: number): number {
  const raw = (direction === "long" ? mark - entry : entry - mark) * ctx.spec.contractSize * lots;
  return convertCurrency(raw, ctx.spec.quoteCurrency, ctx.accountCurrency);
}

export function commissionFor(ctx: SimContext, lots: number): number {
  return (ctx.commissionPerLot || 0) * lots;
}

/** Half-spread offset applied to a fill price. */
function spreadOffset(ctx: SimContext): number {
  return (ctx.spreadPoints || 0) * ctx.spec.tickSize;
}

export function applySpread(ctx: SimContext, direction: "long" | "short", price: number, side: "enter" | "exit"): number {
  const off = spreadOffset(ctx);
  if (!off) return price;
  const buying = (direction === "long" && side === "enter") || (direction === "short" && side === "exit");
  return buying ? price + off : price - off;
}

export type ProcessResult = {
  trades: BacktestTrade[];
  events: SimEvent[];
  /** Realised P&L booked while processing this bar. */
  realised: number;
};

/**
 * Advance the simulation by exactly one bar.
 *
 * Intrabar ordering is conservative: when both SL and TP sit inside the same
 * candle we assume the stop is hit first (worst case), the standard approach
 * used by MT5's "open prices"/"every tick" pessimistic model.
 */
export function processBar(trades: BacktestTrade[], bar: Candle, ctx: SimContext): ProcessResult {
  const events: SimEvent[] = [];
  let realised = 0;
  const barTime = new Date(bar.time * 1000).toISOString();

  const next = trades.map((t) => {
    if (t.status !== "pending" && t.status !== "open") return t;
    let trade: BacktestTrade = { ...t };

    // 1) Pending order fills
    if (trade.status === "pending" && trade.entry != null) {
      const p = trade.entry;
      const touched = bar.low <= p && p <= bar.high;
      const gapped =
        trade.order_type === "stop"
          ? (trade.direction === "long" ? bar.open >= p : bar.open <= p)
          : (trade.direction === "long" ? bar.open <= p : bar.open >= p);
      if (touched || gapped) {
        const fill = gapped ? bar.open : p;
        trade = {
          ...trade,
          status: "open",
          entry: applySpread(ctx, trade.direction, fill, "enter"),
          opened_at: barTime,
        };
        events.push({ kind: "filled", tradeId: trade.id, message: `${trade.direction === "long" ? "Buy" : "Sell"} ${trade.lots} filled @ ${trade.entry?.toFixed(ctx.spec.digits)}` });
      }
    }

    // 2) Excursion tracking + exits for open positions
    if (trade.status === "open" && trade.entry != null) {
      const favourable = trade.direction === "long" ? bar.high : bar.low;
      const adverse = trade.direction === "long" ? bar.low : bar.high;
      const mfe = pnlFor(ctx, trade.direction, trade.entry, favourable, trade.lots);
      const mae = pnlFor(ctx, trade.direction, trade.entry, adverse, trade.lots);
      trade.mfe = Math.max(trade.mfe ?? 0, mfe);
      trade.mae = Math.min(trade.mae ?? 0, mae);

      const hitSl =
        trade.sl != null &&
        (trade.direction === "long" ? bar.low <= trade.sl : bar.high >= trade.sl);
      const hitTp =
        trade.tp != null &&
        (trade.direction === "long" ? bar.high >= trade.tp : bar.low <= trade.tp);

      if (hitSl || hitTp) {
        const reason = hitSl ? "sl" : "tp";
        const rawExit = (hitSl ? trade.sl : trade.tp) as number;
        const exit = applySpread(ctx, trade.direction, rawExit, "exit");
        const gross = pnlFor(ctx, trade.direction, trade.entry, exit, trade.lots);
        const comm = commissionFor(ctx, trade.lots);
        const netPnl = gross - comm;
        realised += netPnl;
        const opened = trade.opened_at ? Date.parse(trade.opened_at) : bar.time * 1000;
        trade = {
          ...trade,
          status: "closed",
          exit,
          exit_reason: reason,
          gross_pnl: gross,
          commission: comm,
          pnl: netPnl,
          closed_at: barTime,
          duration_sec: Math.max(0, Math.round((bar.time * 1000 - opened) / 1000)),
        };
        events.push({
          kind: "closed",
          tradeId: trade.id,
          message: `${reason.toUpperCase()} hit — ${netPnl >= 0 ? "+" : ""}${netPnl.toFixed(2)}`,
        });
      }
    }
    return trade;
  });

  return { trades: next, events, realised };
}

/** Close an open position manually at a mark price. */
export function closeAt(trade: BacktestTrade, mark: number, ctx: SimContext, at: string, reason = "manual"): BacktestTrade {
  const entry = trade.entry ?? mark;
  const exit = applySpread(ctx, trade.direction, mark, "exit");
  const gross = pnlFor(ctx, trade.direction, entry, exit, trade.lots);
  const comm = commissionFor(ctx, trade.lots);
  const opened = trade.opened_at ? Date.parse(trade.opened_at) : Date.parse(at);
  return {
    ...trade,
    status: "closed",
    exit,
    exit_reason: reason,
    gross_pnl: gross,
    commission: comm,
    pnl: gross - comm,
    closed_at: at,
    duration_sec: Math.max(0, Math.round((Date.parse(at) - opened) / 1000)),
  };
}

export function pipsBetween(spec: InstrumentSpec, a: number, b: number): number {
  return Math.abs(a - b) / spec.pipSize;
}