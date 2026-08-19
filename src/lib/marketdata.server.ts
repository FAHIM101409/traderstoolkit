import type { Candle, CandleResponse } from "./marketdata";
import { toTwelveData, TD_INTERVAL } from "./marketdata";

type CacheEntry = { at: number; value: CandleResponse };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000;

export async function fetchTwelveDataSeries(args: {
  symbol: string;
  interval: string;
  outputsize: number;
  end: string | null;
}): Promise<CandleResponse> {
  const apiKey = process.env["TWELVEDATA_API_KEY"];
  const tdSymbol = toTwelveData(args.symbol);
  const tdInterval = TD_INTERVAL[args.interval] ?? "1h";
  const key = `${tdSymbol}|${tdInterval}|${args.outputsize}|${args.end ?? ""}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  if (!apiKey) {
    return { symbol: args.symbol, interval: args.interval, candles: [], error: "Market data key is not configured." };
  }

  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", tdSymbol);
  url.searchParams.set("interval", tdInterval);
  url.searchParams.set("outputsize", String(args.outputsize));
  url.searchParams.set("order", "ASC");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("apikey", apiKey);
  if (args.end) url.searchParams.set("end_date", args.end);

  let json: any;
  try {
    const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
    json = await res.json();
  } catch {
    return { symbol: args.symbol, interval: args.interval, candles: [], error: "Could not reach the market data provider." };
  }

  if (!json || json.status === "error" || !Array.isArray(json.values)) {
    const msg = typeof json?.message === "string" ? json.message : "No historical data available for this symbol and timeframe.";
    return { symbol: args.symbol, interval: args.interval, candles: [], error: msg };
  }

  const candles: Candle[] = [];
  for (const v of json.values) {
    const t = Date.parse(String(v.datetime).includes(" ") ? `${String(v.datetime).replace(" ", "T")}Z` : `${v.datetime}T00:00:00Z`);
    if (!Number.isFinite(t)) continue;
    const o = Number(v.open), h = Number(v.high), l = Number(v.low), c = Number(v.close);
    if (![o, h, l, c].every(Number.isFinite)) continue;
    candles.push({ time: Math.floor(t / 1000), open: o, high: h, low: l, close: c, volume: Number(v.volume) || 0 });
  }
  candles.sort((a, b) => a.time - b.time);

  const value: CandleResponse = { symbol: args.symbol, interval: args.interval, candles };
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 60) cache.delete(cache.keys().next().value as string);
  return value;
}