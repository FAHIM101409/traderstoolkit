import { getSpec, calculatePosition, convertCurrency, type InstrumentSpec } from "@/lib/instruments";

export type BacktestSession = {
  id: string;
  user_id: string;
  name: string;
  symbol: string;
  timeframe: string;
  starting_balance: number;
  ending_balance: number;
  status: "active" | "archived";
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
};

export type BacktestTrade = {
  id: string;
  session_id: string;
  user_id: string;
  symbol: string;
  direction: "long" | "short";
  order_type: "market" | "limit" | "stop";
  status: "pending" | "open" | "closed" | "cancelled";
  entry: number | null;
  sl: number | null;
  tp: number | null;
  exit: number | null;
  exit_reason: string | null;
  lots: number;
  risk_pct: number | null;
  risk_amount: number | null;
  rr: number | null;
  pnl: number;
  opened_at: string | null;
  closed_at: string | null;
  duration_sec: number | null;
};

/** Compute P&L in the account currency for a trade given a mark price. */
export function computePnl(
  spec: InstrumentSpec,
  direction: "long" | "short",
  entry: number,
  markOrExit: number,
  lots: number,
  accountCurrency: string,
): number {
  const rawQuote =
    (direction === "long" ? markOrExit - entry : entry - markOrExit) *
    spec.contractSize *
    lots;
  return convertCurrency(rawQuote, spec.quoteCurrency, accountCurrency);
}

export function computeRR(direction: "long" | "short", entry: number, sl: number, tp: number): number | null {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (!risk) return null;
  // Sanity: tp must be on correct side
  if (direction === "long" && tp <= entry) return -reward / risk;
  if (direction === "short" && tp >= entry) return -reward / risk;
  return reward / risk;
}

/** Compute stats for a set of closed trades. */
export function computeSessionStats(trades: BacktestTrade[], startingBalance: number) {
  const closed = trades.filter((t) => t.status === "closed");
  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl < 0);
  const gross = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const net = closed.reduce((s, t) => s + t.pnl, 0);
  const total = closed.length;
  const winRate = total ? (wins.length / total) * 100 : 0;
  const pf = grossLoss > 0 ? gross / grossLoss : gross > 0 ? Infinity : 0;
  const avgWin = wins.length ? gross / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy = total ? net / total : 0;
  const largestWin = wins.reduce((m, t) => Math.max(m, t.pnl), 0);
  const largestLoss = losses.reduce((m, t) => Math.min(m, t.pnl), 0);
  const avgRR = closed
    .map((t) => t.rr ?? 0)
    .filter((r) => Number.isFinite(r) && r !== 0);
  const meanRR = avgRR.length ? avgRR.reduce((a, b) => a + b, 0) / avgRR.length : 0;
  const avgHold = closed
    .filter((t) => t.duration_sec)
    .map((t) => t.duration_sec as number);
  const meanHold = avgHold.length ? avgHold.reduce((a, b) => a + b, 0) / avgHold.length : 0;
  return {
    trades: total,
    wins: wins.length,
    losses: losses.length,
    winRate,
    net,
    gross,
    grossLoss,
    pf,
    avgWin,
    avgLoss,
    expectancy,
    largestWin,
    largestLoss,
    meanRR,
    meanHold,
    endingBalance: startingBalance + net,
  };
}

export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"];

export { getSpec, calculatePosition };