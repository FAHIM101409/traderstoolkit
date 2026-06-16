export type Instrument = {
  symbol: string;
  label: string;
  group: "Forex" | "Gold" | "Silver" | "Indices" | "Crypto";
  /** USD value per 1 pip per 1 standard lot. */
  pipValuePerLot: number;
  /** Decimal places that define one "pip" for the SL input. */
  pipSize: number;
};

export const INSTRUMENTS: Instrument[] = [
  { symbol: "EURUSD", label: "EUR / USD", group: "Forex", pipValuePerLot: 10, pipSize: 0.0001 },
  { symbol: "GBPUSD", label: "GBP / USD", group: "Forex", pipValuePerLot: 10, pipSize: 0.0001 },
  { symbol: "AUDUSD", label: "AUD / USD", group: "Forex", pipValuePerLot: 10, pipSize: 0.0001 },
  { symbol: "NZDUSD", label: "NZD / USD", group: "Forex", pipValuePerLot: 10, pipSize: 0.0001 },
  { symbol: "USDCAD", label: "USD / CAD", group: "Forex", pipValuePerLot: 10, pipSize: 0.0001 },
  { symbol: "USDCHF", label: "USD / CHF", group: "Forex", pipValuePerLot: 10, pipSize: 0.0001 },
  { symbol: "USDJPY", label: "USD / JPY", group: "Forex", pipValuePerLot: 9.1, pipSize: 0.01 },
  { symbol: "EURJPY", label: "EUR / JPY", group: "Forex", pipValuePerLot: 9.1, pipSize: 0.01 },
  { symbol: "GBPJPY", label: "GBP / JPY", group: "Forex", pipValuePerLot: 9.1, pipSize: 0.01 },
  { symbol: "XAUUSD", label: "Gold (XAU/USD)", group: "Gold", pipValuePerLot: 10, pipSize: 0.1 },
  { symbol: "XAGUSD", label: "Silver (XAG/USD)", group: "Silver", pipValuePerLot: 50, pipSize: 0.01 },
  { symbol: "US30",   label: "US30 (Dow Jones)", group: "Indices", pipValuePerLot: 1, pipSize: 1 },
  { symbol: "NAS100", label: "NAS100 (Nasdaq)", group: "Indices", pipValuePerLot: 1, pipSize: 1 },
  { symbol: "SPX500", label: "SPX500 (S&P 500)", group: "Indices", pipValuePerLot: 1, pipSize: 0.1 },
  { symbol: "BTCUSD", label: "Bitcoin (BTC/USD)", group: "Crypto", pipValuePerLot: 1, pipSize: 1 },
  { symbol: "ETHUSD", label: "Ethereum (ETH/USD)", group: "Crypto", pipValuePerLot: 1, pipSize: 1 },
];

export type PropFirm = {
  id: string;
  name: string;
  dailyDD: number; // percent
  maxDD: number;   // percent
  profitTarget: number; // percent (P1)
};

export const PROP_FIRMS: PropFirm[] = [
  { id: "funding-traders", name: "Funding Traders", dailyDD: 5, maxDD: 10, profitTarget: 8 },
  { id: "fundednext",      name: "FundedNext",      dailyDD: 5, maxDD: 10, profitTarget: 10 },
  { id: "goat",            name: "Goat Funded Trader", dailyDD: 5, maxDD: 10, profitTarget: 8 },
  { id: "aqua",            name: "AquaFunded",      dailyDD: 4, maxDD: 8,  profitTarget: 8 },
];
