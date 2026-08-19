// Client-safe market-data types and symbol mapping for the replay engine.

export type Candle = {
  /** UNIX seconds, UTC. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type CandleResponse = {
  symbol: string;
  interval: string;
  candles: Candle[];
  error?: string;
};

/** Our internal instrument symbol → Twelve Data symbol. */
export const TD_SYMBOL: Record<string, string> = {
  // Forex — Twelve Data uses BASE/QUOTE
  EURUSD: "EUR/USD", GBPUSD: "GBP/USD", USDJPY: "USD/JPY", USDCHF: "USD/CHF",
  USDCAD: "USD/CAD", AUDUSD: "AUD/USD", NZDUSD: "NZD/USD",
  EURGBP: "EUR/GBP", EURJPY: "EUR/JPY", GBPJPY: "GBP/JPY", EURCHF: "EUR/CHF",
  EURAUD: "EUR/AUD", EURCAD: "EUR/CAD", EURNZD: "EUR/NZD", GBPCHF: "GBP/CHF",
  GBPAUD: "GBP/AUD", GBPCAD: "GBP/CAD", GBPNZD: "GBP/NZD", AUDJPY: "AUD/JPY",
  AUDCAD: "AUD/CAD", AUDCHF: "AUD/CHF", AUDNZD: "AUD/NZD", CADJPY: "CAD/JPY",
  CADCHF: "CAD/CHF", CHFJPY: "CHF/JPY", NZDJPY: "NZD/JPY", NZDCAD: "NZD/CAD",
  NZDCHF: "NZD/CHF",
  USDTRY: "USD/TRY", USDZAR: "USD/ZAR", USDMXN: "USD/MXN", USDSEK: "USD/SEK",
  USDNOK: "USD/NOK", USDSGD: "USD/SGD", USDHKD: "USD/HKD", USDPLN: "USD/PLN",
  // Metals
  XAUUSD: "XAU/USD", XAGUSD: "XAG/USD", XPTUSD: "XPT/USD", XPDUSD: "XPD/USD",
  // Crypto
  BTCUSD: "BTC/USD", ETHUSD: "ETH/USD", SOLUSD: "SOL/USD",
  XRPUSD: "XRP/USD", LTCUSD: "LTC/USD", ADAUSD: "ADA/USD", DOGEUSD: "DOGE/USD",
  // Indices (index tickers)
  US30: "DJI", NAS100: "IXIC", SPX500: "SPX", GER40: "DAX",
  UK100: "UKX", JPN225: "N225", FRA40: "CAC", AUS200: "XJO", HK50: "HSI",
  // Commodities
  USOIL: "WTI/USD", UKOIL: "BRENT/USD", NATGAS: "NG/USD",
};

export function toTwelveData(symbol: string): string {
  if (TD_SYMBOL[symbol]) return TD_SYMBOL[symbol];
  if (/^[A-Z]{6}$/.test(symbol)) return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  return symbol;
}

/** Our timeframe id → Twelve Data interval. */
export const TD_INTERVAL: Record<string, string> = {
  "1m": "1min",
  "5m": "5min",
  "15m": "15min",
  "30m": "30min",
  "45m": "45min",
  "1H": "1h",
  "2H": "2h",
  "4H": "4h",
  "1D": "1day",
  "1W": "1week",
  "1M": "1month",
};

export const REPLAY_TIMEFRAMES: { label: string; value: string; seconds: number }[] = [
  { label: "1m", value: "1m", seconds: 60 },
  { label: "5m", value: "5m", seconds: 300 },
  { label: "15m", value: "15m", seconds: 900 },
  { label: "30m", value: "30m", seconds: 1800 },
  { label: "45m", value: "45m", seconds: 2700 },
  { label: "1H", value: "1H", seconds: 3600 },
  { label: "2H", value: "2H", seconds: 7200 },
  { label: "4H", value: "4H", seconds: 14400 },
  { label: "1D", value: "1D", seconds: 86400 },
  { label: "1W", value: "1W", seconds: 604800 },
  { label: "1M", value: "1M", seconds: 2592000 },
];

export function tfSeconds(tf: string): number {
  return REPLAY_TIMEFRAMES.find((t) => t.value === tf)?.seconds ?? 3600;
}