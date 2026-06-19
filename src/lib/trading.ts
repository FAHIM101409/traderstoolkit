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
  { symbol: "AUDJPY", label: "AUD / JPY", group: "Forex", pipValuePerLot: 9.1, pipSize: 0.01 },
  { symbol: "CADJPY", label: "CAD / JPY", group: "Forex", pipValuePerLot: 9.1, pipSize: 0.01 },
  { symbol: "CHFJPY", label: "CHF / JPY", group: "Forex", pipValuePerLot: 9.1, pipSize: 0.01 },
  { symbol: "NZDJPY", label: "NZD / JPY", group: "Forex", pipValuePerLot: 9.1, pipSize: 0.01 },
  { symbol: "EURGBP", label: "EUR / GBP", group: "Forex", pipValuePerLot: 12.7, pipSize: 0.0001 },
  { symbol: "EURCHF", label: "EUR / CHF", group: "Forex", pipValuePerLot: 11.3, pipSize: 0.0001 },
  { symbol: "EURAUD", label: "EUR / AUD", group: "Forex", pipValuePerLot: 6.6, pipSize: 0.0001 },
  { symbol: "EURCAD", label: "EUR / CAD", group: "Forex", pipValuePerLot: 7.3, pipSize: 0.0001 },
  { symbol: "EURNZD", label: "EUR / NZD", group: "Forex", pipValuePerLot: 6.0, pipSize: 0.0001 },
  { symbol: "GBPCHF", label: "GBP / CHF", group: "Forex", pipValuePerLot: 11.3, pipSize: 0.0001 },
  { symbol: "GBPCAD", label: "GBP / CAD", group: "Forex", pipValuePerLot: 7.3, pipSize: 0.0001 },
  { symbol: "GBPAUD", label: "GBP / AUD", group: "Forex", pipValuePerLot: 6.6, pipSize: 0.0001 },
  { symbol: "GBPNZD", label: "GBP / NZD", group: "Forex", pipValuePerLot: 6.0, pipSize: 0.0001 },
  { symbol: "AUDCAD", label: "AUD / CAD", group: "Forex", pipValuePerLot: 7.3, pipSize: 0.0001 },
  { symbol: "AUDCHF", label: "AUD / CHF", group: "Forex", pipValuePerLot: 11.3, pipSize: 0.0001 },
  { symbol: "AUDNZD", label: "AUD / NZD", group: "Forex", pipValuePerLot: 6.0, pipSize: 0.0001 },
  { symbol: "NZDCAD", label: "NZD / CAD", group: "Forex", pipValuePerLot: 7.3, pipSize: 0.0001 },
  { symbol: "NZDCHF", label: "NZD / CHF", group: "Forex", pipValuePerLot: 11.3, pipSize: 0.0001 },
  { symbol: "CADCHF", label: "CAD / CHF", group: "Forex", pipValuePerLot: 11.3, pipSize: 0.0001 },
  { symbol: "XAUUSD", label: "Gold (XAU/USD)", group: "Gold", pipValuePerLot: 10, pipSize: 0.1 },
  { symbol: "XAGUSD", label: "Silver (XAG/USD)", group: "Silver", pipValuePerLot: 50, pipSize: 0.01 },
  { symbol: "US30",   label: "US30 (Dow Jones)", group: "Indices", pipValuePerLot: 1, pipSize: 1 },
  { symbol: "NAS100", label: "NAS100 (Nasdaq)", group: "Indices", pipValuePerLot: 1, pipSize: 1 },
  { symbol: "SPX500", label: "SPX500 (S&P 500)", group: "Indices", pipValuePerLot: 1, pipSize: 0.1 },
  { symbol: "GER40",  label: "GER40 (DAX)", group: "Indices", pipValuePerLot: 1, pipSize: 1 },
  { symbol: "UK100",  label: "UK100 (FTSE)", group: "Indices", pipValuePerLot: 1, pipSize: 1 },
  { symbol: "JPN225", label: "JPN225 (Nikkei)", group: "Indices", pipValuePerLot: 1, pipSize: 1 },
  { symbol: "BTCUSD", label: "Bitcoin (BTC/USD)", group: "Crypto", pipValuePerLot: 1, pipSize: 1 },
  { symbol: "ETHUSD", label: "Ethereum (ETH/USD)", group: "Crypto", pipValuePerLot: 1, pipSize: 1 },
  { symbol: "SOLUSD", label: "Solana (SOL/USD)", group: "Crypto", pipValuePerLot: 1, pipSize: 0.01 },
  { symbol: "XRPUSD", label: "Ripple (XRP/USD)", group: "Crypto", pipValuePerLot: 1, pipSize: 0.0001 },
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
