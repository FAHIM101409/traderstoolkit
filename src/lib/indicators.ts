import type { Candle } from "./marketdata";

export type LinePoint = { time: number; value: number };

export type IndicatorKind =
  | "sma" | "ema" | "wma" | "bb" | "vwap"
  | "rsi" | "macd" | "atr" | "stoch";

export type IndicatorConfig = {
  id: string;
  kind: IndicatorKind;
  /** Primary period / fast length. */
  length: number;
  /** Secondary param: BB stdev, MACD slow, Stoch smoothing. */
  param2?: number;
  /** Tertiary param: MACD signal. */
  param3?: number;
  color: string;
  visible: boolean;
};

export const INDICATOR_META: Record<IndicatorKind, { label: string; pane: "main" | "sub"; defaults: Partial<IndicatorConfig> }> = {
  sma:   { label: "Simple Moving Average", pane: "main", defaults: { length: 20, color: "#38bdf8" } },
  ema:   { label: "Exponential Moving Average", pane: "main", defaults: { length: 50, color: "#f59e0b" } },
  wma:   { label: "Weighted Moving Average", pane: "main", defaults: { length: 20, color: "#a78bfa" } },
  bb:    { label: "Bollinger Bands", pane: "main", defaults: { length: 20, param2: 2, color: "#94a3b8" } },
  vwap:  { label: "VWAP (session)", pane: "main", defaults: { length: 0, color: "#22d3ee" } },
  rsi:   { label: "RSI", pane: "sub", defaults: { length: 14, color: "#e879f9" } },
  macd:  { label: "MACD", pane: "sub", defaults: { length: 12, param2: 26, param3: 9, color: "#60a5fa" } },
  atr:   { label: "ATR", pane: "sub", defaults: { length: 14, color: "#fbbf24" } },
  stoch: { label: "Stochastic", pane: "sub", defaults: { length: 14, param2: 3, color: "#34d399" } },
};

export function sma(values: number[], length: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= length) sum -= values[i - length];
    out.push(i >= length - 1 ? sum / length : null);
  }
  return out;
}

export function ema(values: number[], length: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (length + 1);
  let prev: number | null = null;
  let seed = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < length - 1) { seed += values[i]; out.push(null); continue; }
    if (prev === null) { seed += values[i]; prev = seed / length; out.push(prev); continue; }
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function wma(values: number[], length: number): (number | null)[] {
  const denom = (length * (length + 1)) / 2;
  return values.map((_, i) => {
    if (i < length - 1) return null;
    let acc = 0;
    for (let j = 0; j < length; j++) acc += values[i - length + 1 + j] * (j + 1);
    return acc / denom;
  });
}

export function stdev(values: number[], length: number, means: (number | null)[]): (number | null)[] {
  return values.map((_, i) => {
    const m = means[i];
    if (m === null || i < length - 1) return null;
    let acc = 0;
    for (let j = i - length + 1; j <= i; j++) acc += (values[j] - m) ** 2;
    return Math.sqrt(acc / length);
  });
}

export function rsi(closes: number[], length: number): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    const gain = Math.max(ch, 0), loss = Math.max(-ch, 0);
    if (i <= length) {
      avgGain += gain / length; avgLoss += loss / length;
      if (i === length) out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    } else {
      avgGain = (avgGain * (length - 1) + gain) / length;
      avgLoss = (avgLoss * (length - 1) + loss) / length;
      out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
  }
  return out;
}

export function trueRanges(candles: Candle[]): number[] {
  return candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const p = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - p), Math.abs(c.low - p));
  });
}

export function atr(candles: Candle[], length: number): (number | null)[] {
  const tr = trueRanges(candles);
  const out: (number | null)[] = new Array(candles.length).fill(null);
  let prev: number | null = null;
  for (let i = 0; i < tr.length; i++) {
    if (i < length - 1) continue;
    if (prev === null) {
      let s = 0; for (let j = 0; j <= i; j++) s += tr[j];
      prev = s / (i + 1);
    } else {
      prev = (prev * (length - 1) + tr[i]) / length;
    }
    out[i] = prev;
  }
  return out;
}

export function stochastic(candles: Candle[], length: number, smoothing: number) {
  const k: (number | null)[] = candles.map((_, i) => {
    if (i < length - 1) return null;
    let hh = -Infinity, ll = Infinity;
    for (let j = i - length + 1; j <= i; j++) {
      hh = Math.max(hh, candles[j].high);
      ll = Math.min(ll, candles[j].low);
    }
    const range = hh - ll;
    return range === 0 ? 50 : ((candles[i].close - ll) / range) * 100;
  });
  const filled = k.map((v) => v ?? 0);
  const d = sma(filled, smoothing).map((v, i) => (k[i] === null ? null : v));
  return { k, d };
}

export function macd(closes: number[], fast: number, slow: number, signal: number) {
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  const line = closes.map((_, i) => (f[i] !== null && s[i] !== null ? (f[i] as number) - (s[i] as number) : null));
  const sig = ema(line.map((v) => v ?? 0), signal).map((v, i) => (line[i] === null ? null : v));
  const hist = line.map((v, i) => (v !== null && sig[i] !== null ? v - (sig[i] as number) : null));
  return { line, signal: sig, hist };
}

/** Session-anchored VWAP — resets each UTC day. */
export function vwap(candles: Candle[]): (number | null)[] {
  let day = "";
  let pv = 0, vol = 0;
  return candles.map((c) => {
    const d = new Date(c.time * 1000).toISOString().slice(0, 10);
    if (d !== day) { day = d; pv = 0; vol = 0; }
    const typical = (c.high + c.low + c.close) / 3;
    const v = c.volume || 1;
    pv += typical * v; vol += v;
    return vol ? pv / vol : null;
  });
}

function toPoints(candles: Candle[], values: (number | null)[]): LinePoint[] {
  const out: LinePoint[] = [];
  for (let i = 0; i < candles.length; i++) {
    const v = values[i];
    if (v !== null && Number.isFinite(v)) out.push({ time: candles[i].time, value: v });
  }
  return out;
}

export type IndicatorSeries = {
  config: IndicatorConfig;
  pane: "main" | "sub";
  lines: { key: string; color: string; points: LinePoint[]; lineWidth?: number }[];
  histogram?: { key: string; points: LinePoint[] };
  /** Fixed guide levels for sub-panes (e.g. RSI 30/70). */
  levels?: number[];
  range?: [number, number];
};

export function computeIndicator(cfg: IndicatorConfig, candles: Candle[]): IndicatorSeries {
  const closes = candles.map((c) => c.close);
  const meta = INDICATOR_META[cfg.kind];
  const base: IndicatorSeries = { config: cfg, pane: meta.pane, lines: [] };

  switch (cfg.kind) {
    case "sma":
      base.lines = [{ key: `SMA ${cfg.length}`, color: cfg.color, points: toPoints(candles, sma(closes, cfg.length)) }];
      break;
    case "ema":
      base.lines = [{ key: `EMA ${cfg.length}`, color: cfg.color, points: toPoints(candles, ema(closes, cfg.length)) }];
      break;
    case "wma":
      base.lines = [{ key: `WMA ${cfg.length}`, color: cfg.color, points: toPoints(candles, wma(closes, cfg.length)) }];
      break;
    case "bb": {
      const mid = sma(closes, cfg.length);
      const sd = stdev(closes, cfg.length, mid);
      const mult = cfg.param2 ?? 2;
      base.lines = [
        { key: "BB upper", color: cfg.color, points: toPoints(candles, mid.map((m, i) => (m !== null && sd[i] !== null ? m + mult * (sd[i] as number) : null))) },
        { key: "BB basis", color: cfg.color, points: toPoints(candles, mid), lineWidth: 1 },
        { key: "BB lower", color: cfg.color, points: toPoints(candles, mid.map((m, i) => (m !== null && sd[i] !== null ? m - mult * (sd[i] as number) : null))) },
      ];
      break;
    }
    case "vwap":
      base.lines = [{ key: "VWAP", color: cfg.color, points: toPoints(candles, vwap(candles)) }];
      break;
    case "rsi":
      base.lines = [{ key: `RSI ${cfg.length}`, color: cfg.color, points: toPoints(candles, rsi(closes, cfg.length)) }];
      base.levels = [30, 50, 70];
      base.range = [0, 100];
      break;
    case "macd": {
      const m = macd(closes, cfg.length, cfg.param2 ?? 26, cfg.param3 ?? 9);
      base.lines = [
        { key: "MACD", color: cfg.color, points: toPoints(candles, m.line) },
        { key: "Signal", color: "#f97316", points: toPoints(candles, m.signal) },
      ];
      base.histogram = { key: "Hist", points: toPoints(candles, m.hist) };
      base.levels = [0];
      break;
    }
    case "atr":
      base.lines = [{ key: `ATR ${cfg.length}`, color: cfg.color, points: toPoints(candles, atr(candles, cfg.length)) }];
      break;
    case "stoch": {
      const s = stochastic(candles, cfg.length, cfg.param2 ?? 3);
      base.lines = [
        { key: "%K", color: cfg.color, points: toPoints(candles, s.k) },
        { key: "%D", color: "#f43f5e", points: toPoints(candles, s.d) },
      ];
      base.levels = [20, 80];
      base.range = [0, 100];
      break;
    }
  }
  return base;
}

/** Heikin-Ashi transform for the candle series. */
export function heikinAshi(candles: Candle[]): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const close = (c.open + c.high + c.low + c.close) / 4;
    const prev = out[i - 1];
    const open = prev ? (prev.open + prev.close) / 2 : (c.open + c.close) / 2;
    out.push({
      time: c.time,
      open,
      close,
      high: Math.max(c.high, open, close),
      low: Math.min(c.low, open, close),
      volume: c.volume,
    });
  }
  return out;
}