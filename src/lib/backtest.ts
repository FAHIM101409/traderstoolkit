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

// ============================================================================
// Extended analytics for the Backtesting Station
// ============================================================================

export type EquityPoint = { i: number; balance: number; time: string };

export function computeEquityCurve(trades: BacktestTrade[], startingBalance: number): EquityPoint[] {
  const closed = trades
    .filter((t) => t.status === "closed" && t.closed_at)
    .sort((a, b) => Date.parse(a.closed_at!) - Date.parse(b.closed_at!));
  const pts: EquityPoint[] = [{ i: 0, balance: startingBalance, time: closed[0]?.closed_at ?? new Date().toISOString() }];
  let bal = startingBalance;
  closed.forEach((t, i) => {
    bal += t.pnl ?? 0;
    pts.push({ i: i + 1, balance: +bal.toFixed(2), time: t.closed_at! });
  });
  return pts;
}

export function computeMaxDrawdown(eq: EquityPoint[]): { absolute: number; percent: number } {
  let peak = eq[0]?.balance ?? 0;
  let absDD = 0;
  let pctDD = 0;
  for (const p of eq) {
    if (p.balance > peak) peak = p.balance;
    const dd = peak - p.balance;
    if (dd > absDD) absDD = dd;
    const pct = peak > 0 ? (dd / peak) * 100 : 0;
    if (pct > pctDD) pctDD = pct;
  }
  return { absolute: absDD, percent: pctDD };
}

export function groupBy<K extends string | number>(trades: BacktestTrade[], keyFn: (t: BacktestTrade) => K) {
  const map = new Map<K, { key: K; count: number; pnl: number; wins: number }>();
  for (const t of trades) {
    if (t.status !== "closed") continue;
    const k = keyFn(t);
    const row = map.get(k) ?? { key: k, count: 0, pnl: 0, wins: 0 };
    row.count += 1;
    row.pnl += t.pnl ?? 0;
    if ((t.pnl ?? 0) > 0) row.wins += 1;
    map.set(k, row);
  }
  return Array.from(map.values());
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function breakdownByDay(trades: BacktestTrade[]) {
  return groupBy(trades, (t) => DOW[new Date(t.closed_at ?? t.opened_at ?? Date.now()).getUTCDay()])
    .sort((a, b) => DOW.indexOf(a.key as string) - DOW.indexOf(b.key as string));
}

export function breakdownBySymbol(trades: BacktestTrade[]) {
  return groupBy(trades, (t) => t.symbol).sort((a, b) => b.pnl - a.pnl);
}

export function breakdownByHour(trades: BacktestTrade[]) {
  return groupBy(trades, (t) => new Date(t.closed_at ?? t.opened_at ?? Date.now()).getUTCHours())
    .sort((a, b) => (a.key as number) - (b.key as number));
}

/** Daily P&L calendar — { "2026-07-08": 123.45, ... } */
export function dailyPnlCalendar(trades: BacktestTrade[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of trades) {
    if (t.status !== "closed" || !t.closed_at) continue;
    const d = t.closed_at.slice(0, 10);
    out[d] = (out[d] ?? 0) + (t.pnl ?? 0);
  }
  return out;
}

export function pnlDistribution(trades: BacktestTrade[], bins = 12) {
  const closed = trades.filter((t) => t.status === "closed");
  if (!closed.length) return [];
  const vals = closed.map((t) => t.pnl ?? 0);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const step = (max - min) / bins || 1;
  const out = Array.from({ length: bins }, (_, i) => ({
    from: min + i * step,
    to: min + (i + 1) * step,
    count: 0,
  }));
  for (const v of vals) {
    const idx = Math.min(bins - 1, Math.floor((v - min) / step));
    out[idx].count += 1;
  }
  return out;
}