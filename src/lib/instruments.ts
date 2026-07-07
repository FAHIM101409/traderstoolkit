// Institution-grade contract specifications for all supported instruments.
// Values follow the conventions used by mainstream MT5 brokers (IC Markets,
// Pepperstone, FTMO, Exness, Vantage, etc.). Users can still override any
// value manually in the calculator UI when their broker differs.

export type InstrumentGroup =
  | "Forex Major"
  | "Forex Minor"
  | "Forex Cross"
  | "Forex Exotic"
  | "Metals"
  | "Indices"
  | "Crypto"
  | "Commodities";

export type InstrumentSpec = {
  symbol: string;
  label: string;
  group: InstrumentGroup;
  /** Units of the base asset per 1 standard lot. */
  contractSize: number;
  /** Smallest price increment. */
  tickSize: number;
  /** One "pip" as commonly quoted by brokers/traders. */
  pipSize: number;
  /** Price digits after the decimal. */
  digits: number;
  /** Currency the instrument is priced in (P/L accrues in this currency). */
  quoteCurrency: string;
  /** Broker defaults — user can override. */
  minLot: number;
  maxLot: number;
  lotStep: number;
  /** Reference price used only as a placeholder in Entry & SL Price mode. */
  referencePrice: number;
};

const fx = (symbol: string, group: InstrumentGroup, ref: number): InstrumentSpec => {
  const jpy = symbol.endsWith("JPY");
  const base = symbol.slice(0, 3);
  const quote = symbol.slice(3, 6);
  return {
    symbol,
    label: `${base} / ${quote}`,
    group,
    contractSize: 100_000,
    tickSize: jpy ? 0.001 : 0.00001,
    pipSize: jpy ? 0.01 : 0.0001,
    digits: jpy ? 3 : 5,
    quoteCurrency: quote,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    referencePrice: ref,
  };
};

export const INSTRUMENT_SPECS: InstrumentSpec[] = [
  // --- Forex Majors ---
  fx("EURUSD", "Forex Major", 1.08),
  fx("GBPUSD", "Forex Major", 1.27),
  fx("USDJPY", "Forex Major", 155),
  fx("USDCHF", "Forex Major", 0.88),
  fx("USDCAD", "Forex Major", 1.37),
  fx("AUDUSD", "Forex Major", 0.66),
  fx("NZDUSD", "Forex Major", 0.60),

  // --- Forex Minors (major crosses without USD) ---
  fx("EURGBP", "Forex Minor", 0.85),
  fx("EURJPY", "Forex Minor", 167),
  fx("GBPJPY", "Forex Minor", 197),
  fx("EURCHF", "Forex Minor", 0.95),
  fx("EURAUD", "Forex Minor", 1.63),
  fx("EURCAD", "Forex Minor", 1.48),
  fx("EURNZD", "Forex Minor", 1.80),
  fx("GBPCHF", "Forex Minor", 1.12),
  fx("GBPAUD", "Forex Minor", 1.92),
  fx("GBPCAD", "Forex Minor", 1.74),
  fx("GBPNZD", "Forex Minor", 2.12),
  fx("AUDJPY", "Forex Cross", 102),
  fx("AUDCAD", "Forex Cross", 0.90),
  fx("AUDCHF", "Forex Cross", 0.58),
  fx("AUDNZD", "Forex Cross", 1.10),
  fx("CADJPY", "Forex Cross", 113),
  fx("CADCHF", "Forex Cross", 0.64),
  fx("CHFJPY", "Forex Cross", 176),
  fx("NZDJPY", "Forex Cross", 93),
  fx("NZDCAD", "Forex Cross", 0.82),
  fx("NZDCHF", "Forex Cross", 0.53),

  // --- Forex Exotics ---
  fx("USDZAR", "Forex Exotic", 18),
  fx("USDTRY", "Forex Exotic", 34),
  fx("USDMXN", "Forex Exotic", 20),
  fx("USDSGD", "Forex Exotic", 1.34),
  fx("USDHKD", "Forex Exotic", 7.8),
  fx("USDCNH", "Forex Exotic", 7.2),
  fx("USDPLN", "Forex Exotic", 4.0),
  fx("USDSEK", "Forex Exotic", 10.7),
  fx("USDNOK", "Forex Exotic", 10.9),
  fx("USDDKK", "Forex Exotic", 6.9),
  fx("USDTHB", "Forex Exotic", 35),
  fx("USDCZK", "Forex Exotic", 23),
  fx("USDHUF", "Forex Exotic", 370),
  fx("USDILS", "Forex Exotic", 3.7),

  // --- Metals ---
  { symbol: "XAUUSD", label: "Gold (XAU/USD)", group: "Metals",
    contractSize: 100, tickSize: 0.01, pipSize: 0.1, digits: 2,
    quoteCurrency: "USD", minLot: 0.01, maxLot: 100, lotStep: 0.01, referencePrice: 2650 },
  { symbol: "XAGUSD", label: "Silver (XAG/USD)", group: "Metals",
    contractSize: 5000, tickSize: 0.001, pipSize: 0.01, digits: 3,
    quoteCurrency: "USD", minLot: 0.01, maxLot: 100, lotStep: 0.01, referencePrice: 31 },
  { symbol: "XPTUSD", label: "Platinum (XPT/USD)", group: "Metals",
    contractSize: 100, tickSize: 0.01, pipSize: 0.1, digits: 2,
    quoteCurrency: "USD", minLot: 0.01, maxLot: 100, lotStep: 0.01, referencePrice: 950 },
  { symbol: "XPDUSD", label: "Palladium (XPD/USD)", group: "Metals",
    contractSize: 100, tickSize: 0.01, pipSize: 0.1, digits: 2,
    quoteCurrency: "USD", minLot: 0.01, maxLot: 100, lotStep: 0.01, referencePrice: 970 },

  // --- Indices (CFDs — 1 unit per lot, $1/point in quote currency) ---
  { symbol: "US30",   label: "US30 (Dow Jones)",   group: "Indices",
    contractSize: 1, tickSize: 0.1, pipSize: 1, digits: 1, quoteCurrency: "USD",
    minLot: 0.01, maxLot: 500, lotStep: 0.01, referencePrice: 44000 },
  { symbol: "NAS100", label: "NAS100 (Nasdaq 100)", group: "Indices",
    contractSize: 1, tickSize: 0.1, pipSize: 1, digits: 1, quoteCurrency: "USD",
    minLot: 0.01, maxLot: 500, lotStep: 0.01, referencePrice: 21000 },
  { symbol: "SPX500", label: "SPX500 (S&P 500)",   group: "Indices",
    contractSize: 1, tickSize: 0.1, pipSize: 0.1, digits: 2, quoteCurrency: "USD",
    minLot: 0.01, maxLot: 500, lotStep: 0.01, referencePrice: 5900 },
  { symbol: "GER40",  label: "GER40 (DAX)",         group: "Indices",
    contractSize: 1, tickSize: 0.1, pipSize: 1, digits: 1, quoteCurrency: "EUR",
    minLot: 0.01, maxLot: 500, lotStep: 0.01, referencePrice: 19500 },
  { symbol: "UK100",  label: "UK100 (FTSE 100)",    group: "Indices",
    contractSize: 1, tickSize: 0.1, pipSize: 1, digits: 1, quoteCurrency: "GBP",
    minLot: 0.01, maxLot: 500, lotStep: 0.01, referencePrice: 8200 },
  { symbol: "JPN225", label: "JPN225 (Nikkei)",     group: "Indices",
    contractSize: 1, tickSize: 1, pipSize: 1, digits: 0, quoteCurrency: "JPY",
    minLot: 0.01, maxLot: 500, lotStep: 0.01, referencePrice: 39000 },
  { symbol: "FRA40",  label: "FRA40 (CAC 40)",       group: "Indices",
    contractSize: 1, tickSize: 0.1, pipSize: 1, digits: 1, quoteCurrency: "EUR",
    minLot: 0.01, maxLot: 500, lotStep: 0.01, referencePrice: 7400 },
  { symbol: "AUS200", label: "AUS200 (ASX 200)",    group: "Indices",
    contractSize: 1, tickSize: 0.1, pipSize: 1, digits: 1, quoteCurrency: "AUD",
    minLot: 0.01, maxLot: 500, lotStep: 0.01, referencePrice: 8300 },
  { symbol: "HK50",   label: "HK50 (Hang Seng)",    group: "Indices",
    contractSize: 1, tickSize: 1, pipSize: 1, digits: 0, quoteCurrency: "HKD",
    minLot: 0.01, maxLot: 500, lotStep: 0.01, referencePrice: 20000 },

  // --- Crypto ---
  { symbol: "BTCUSD", label: "Bitcoin (BTC/USD)",  group: "Crypto",
    contractSize: 1, tickSize: 0.01, pipSize: 1, digits: 2, quoteCurrency: "USD",
    minLot: 0.01, maxLot: 100, lotStep: 0.01, referencePrice: 95000 },
  { symbol: "ETHUSD", label: "Ethereum (ETH/USD)", group: "Crypto",
    contractSize: 1, tickSize: 0.01, pipSize: 1, digits: 2, quoteCurrency: "USD",
    minLot: 0.01, maxLot: 500, lotStep: 0.01, referencePrice: 3400 },
  { symbol: "SOLUSD", label: "Solana (SOL/USD)",   group: "Crypto",
    contractSize: 1, tickSize: 0.01, pipSize: 0.1, digits: 2, quoteCurrency: "USD",
    minLot: 0.01, maxLot: 1000, lotStep: 0.01, referencePrice: 210 },
  { symbol: "XRPUSD", label: "Ripple (XRP/USD)",   group: "Crypto",
    contractSize: 1, tickSize: 0.00001, pipSize: 0.0001, digits: 5, quoteCurrency: "USD",
    minLot: 0.01, maxLot: 5000, lotStep: 0.01, referencePrice: 2.2 },
  { symbol: "LTCUSD", label: "Litecoin (LTC/USD)", group: "Crypto",
    contractSize: 1, tickSize: 0.01, pipSize: 0.1, digits: 2, quoteCurrency: "USD",
    minLot: 0.01, maxLot: 500, lotStep: 0.01, referencePrice: 105 },

  // --- Commodities ---
  { symbol: "USOIL",  label: "WTI Crude Oil",      group: "Commodities",
    contractSize: 1000, tickSize: 0.01, pipSize: 0.01, digits: 2, quoteCurrency: "USD",
    minLot: 0.01, maxLot: 100, lotStep: 0.01, referencePrice: 70 },
  { symbol: "UKOIL",  label: "Brent Crude Oil",    group: "Commodities",
    contractSize: 1000, tickSize: 0.01, pipSize: 0.01, digits: 2, quoteCurrency: "USD",
    minLot: 0.01, maxLot: 100, lotStep: 0.01, referencePrice: 74 },
  { symbol: "NATGAS", label: "Natural Gas",        group: "Commodities",
    contractSize: 10000, tickSize: 0.001, pipSize: 0.01, digits: 3, quoteCurrency: "USD",
    minLot: 0.01, maxLot: 100, lotStep: 0.01, referencePrice: 3.2 },
];

export function getSpec(symbol: string): InstrumentSpec {
  return INSTRUMENT_SPECS.find((s) => s.symbol === symbol) ?? INSTRUMENT_SPECS[0];
}

/** Round `value` down to the nearest `step` (broker lot-step compliance). */
export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.floor(value / step) * step;
}

/** Clamp a lot size to the broker's min/max range. */
export function clampLots(value: number, spec: Pick<InstrumentSpec, "minLot" | "maxLot" | "lotStep">): number {
  const rounded = roundToStep(value, spec.lotStep);
  if (rounded < spec.minLot) return 0;
  if (rounded > spec.maxLot) return spec.maxLot;
  return rounded;
}

// ============================================================================
// Universal position-size engine
// ============================================================================

import { getCurrency } from "@/lib/currencies";

/** 1 unit of `code` → this many USD. */
function toUsdRate(code: string): number {
  const c = getCurrency(code);
  return 1 / (c.usdRate || 1);
}

/** Convert an amount from currency `from` to currency `to`. */
export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const usd = amount * toUsdRate(from);
  return usd / toUsdRate(to);
}

export type PositionInput = {
  spec: InstrumentSpec;
  accountCurrency: string;
  riskAmountAccountCcy: number;
  /** Absolute price distance between entry and stop-loss. */
  priceDistance: number;
  /** Optional override for the pip/tick value multipliers. */
  contractSizeOverride?: number;
};

export type PositionResult = {
  lots: number;
  rawLots: number;
  pipDistance: number;
  tickDistance: number;
  /** Value of one pip per 1 lot expressed in the account currency. */
  pipValueAccountCcy: number;
  /** Value of one tick per 1 lot expressed in the account currency. */
  tickValueAccountCcy: number;
  /** Value of one tick per 1 lot expressed in the quote currency. */
  tickValueQuoteCcy: number;
  /** Actual money at risk once lot size is rounded to the broker step. */
  effectiveRisk: number;
  /** Quote→Account FX rate used for conversion. */
  quoteToAccountRate: number;
  warnings: string[];
};

/**
 * Universal position-size math.
 *
 *   loss (in quote ccy) = lots × contractSize × priceDistance
 *   loss (in account ccy) = loss (quote) × quoteToAccountRate
 *
 * Solving for lots:
 *   lots = riskAccount / (contractSize × priceDistance × quoteToAccountRate)
 *
 * This works for every asset class because contractSize + quoteCurrency
 * captures the broker's specification exactly (matches MT5 SYMBOL_TRADE_
 * CONTRACT_SIZE / SYMBOL_CURRENCY_PROFIT).
 */
export function calculatePosition(input: PositionInput): PositionResult {
  const { spec, accountCurrency, riskAmountAccountCcy, priceDistance } = input;
  const contractSize = input.contractSizeOverride ?? spec.contractSize;
  const warnings: string[] = [];

  const quoteToAccountRate = convertCurrency(1, spec.quoteCurrency, accountCurrency);
  const pipValueQuote = contractSize * spec.pipSize;
  const tickValueQuote = contractSize * spec.tickSize;
  const pipValueAccount = pipValueQuote * quoteToAccountRate;
  const tickValueAccount = tickValueQuote * quoteToAccountRate;

  const pipDistance = spec.pipSize > 0 ? priceDistance / spec.pipSize : 0;
  const tickDistance = spec.tickSize > 0 ? priceDistance / spec.tickSize : 0;

  let rawLots = 0;
  if (priceDistance > 0 && riskAmountAccountCcy > 0) {
    rawLots = riskAmountAccountCcy / (contractSize * priceDistance * quoteToAccountRate);
  }

  let lots = clampLots(rawLots, spec);
  if (rawLots > 0 && lots === 0) {
    warnings.push(`Calculated size ${rawLots.toFixed(4)} is below the minimum lot (${spec.minLot}). Increase risk or reduce the stop distance.`);
  }
  if (rawLots > spec.maxLot) {
    warnings.push(`Calculated size ${rawLots.toFixed(2)} exceeds the broker maximum (${spec.maxLot}). Size has been capped.`);
  }

  const effectiveRisk = lots * contractSize * priceDistance * quoteToAccountRate;

  return {
    lots,
    rawLots,
    pipDistance,
    tickDistance,
    pipValueAccountCcy: pipValueAccount,
    tickValueAccountCcy: tickValueAccount,
    tickValueQuoteCcy: tickValueQuote,
    effectiveRisk,
    quoteToAccountRate,
    warnings,
  };
}